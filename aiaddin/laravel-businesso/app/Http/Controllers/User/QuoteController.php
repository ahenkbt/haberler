<?php

namespace App\Http\Controllers\User;

use App\Models\User\BasicSetting;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User\Quote;
use App\Models\BasicExtended as BE;
use App\Models\User\Language;
use App\Models\User\QuoteInput;
use App\Models\User\QuoteInputOption;
use Illuminate\Support\Facades\Auth;
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;
use Validator;
use Session;

class QuoteController extends Controller
{
    public function visibility()
    {
        $user = Auth::guard('web')->user();
        $data['abs'] = BasicSetting::where([
            ['user_id', $user->id]
        ])->first();
        return view('user.quote.visibility', $data);
    }

    public function updateVisibility(Request $request): \Illuminate\Http\RedirectResponse
    {
        $bss = BasicSetting::where('user_id', Auth::id())->get();
        foreach ($bss as $bs) {
            $bs->is_quote = $request->is_quote;
            $bs->save();
        }
        Session::flash('success', __('Page status updated successfully') . '!');
        return back();
    }

    public function form(Request $request)
    {
        $user = Auth::guard('web')->user();

        $lang = Language::where([
            ['code', $request->language],
            ['user_id', $user->id]
        ])->firstOrFail();

        $data['lang_id'] = $lang->id;
        $data['abs'] = $lang->basic_setting;

        $data['inputs'] = QuoteInput::where([
            ['language_id', $lang->id],
            ['user_id', $user->id]
        ])->orderBy('order_number', 'ASC')->get();

        return view('user.quote.form', $data);
    }

    public function orderUpdate(Request $request){
        $ids = $request->ids;
        $orders = $request->orders;

        if (!empty($ids)) {
            foreach ($request->ids as $key => $id) {
                $input = QuoteInput::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
                $input->order_number = $orders["$key"];
                $input->save();
            }
        }
    }

    public function formstore(Request $request)
    {
        $inname = make_input_name($request->label);

        $inputs = QuoteInput::where([
            ['language_id', $request->language_id],
            ['user_id', Auth::id()]
        ])->get();

        $rules = [
            'label' => [
                'required',
                function ($attribute, $value, $fail) use ($inname, $inputs) {
                    foreach ($inputs as $input) {
                        if (strtolower($input->name) == strtolower($inname)) {
                            $fail( __('Input field already exists') . ".");
                        }
                    }
                },
            ],
            'placeholder' => 'required_unless:type,3,5',
            'type' => 'required',
            'options.*' => 'required_if:type,2,3'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $maxOrder = QuoteInput::where([
            ['language_id', $request->language_id],
            ['user_id', Auth::id()]
        ])->max('order_number');

        $input = new QuoteInput;
        $input->language_id = $request->language_id;
        $input->user_id = Auth::id();
        $input->type = $request->type;
        $input->label = $request->label;
        $input->name = $inname;
        $input->placeholder = $request->placeholder;
        $input->required = $request->required;
        $input->order_number = $maxOrder + 1;
        $input->save();

        if ($request->type == 2 || $request->type == 3) {
            $options = $request->options;
            foreach ($options as $option) {
                $op = new QuoteInputOption;
                $op->quote_input_id = $input->id;
                $op->name = $option;
                $op->save();
            }
        }

        Session::flash('success', __('Input field added successfully') . '!');
        return "success";
    }

    public function inputDelete(Request $request): \Illuminate\Http\RedirectResponse
    {
        $input = QuoteInput::where('user_id', Auth::user()->id)->where('id', $request->input_id)->firstOrFail();
        $input->quote_input_options()->delete();
        $input->delete();
        Session::flash('success', __('Input field deleted successfully') . '!');
        return back();
    }

    public function inputEdit($id)
    {
        $data['input'] = QuoteInput::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        if (!empty($data['input']->quote_input_options)) {
            $options = $data['input']->quote_input_options;
            $data['options'] = $options;
            $data['counter'] = count($options);
        }
        return view('user.quote.form-edit', $data);
    }

    public function inputUpdate(Request $request)
    {
        $inname = make_input_name($request->label);
        $input = QuoteInput::where('user_id', Auth::user()->id)->where('id', $request->input_id)->firstOrFail();
        $inputs = QuoteInput::where([
            ['language_id', $input->language_id],
            ['user_id', Auth::id()]
        ])->get();


        $rules = [
            'label' => [
                'required',
                function ($attribute, $value, $fail) use ($inname, $inputs, $input) {
                    foreach ($inputs as $in) {
                        if (strtolower($in->name) == strtolower($inname) && strtolower($inname) != strtolower($input->name)) {
                            $fail( __('Input field already exists') . ".");
                        }
                    }
                },
            ],
            'placeholder' => 'required_unless:type,3,5',
            'options' => [
                'required_if:type,2,3',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->type == 2 || $request->type == 3) {
                        foreach ($request->options as $option) {
                            if (empty($option)) {
                                $fail(__('All option fields are required') . '.');
                            }
                        }
                    }
                },
            ]
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $input->label = $request->label;
        $input->name = $inname;

        // if input is checkbox then placeholder is not required
        if ($request->type != 3 && $request->type != 5) {
            $input->placeholder = $request->placeholder;
        }
        $input->required = $request->required;
        $input->save();

        if ($request->type == 2 || $request->type == 3) {
            $input->quote_input_options()->delete();
            $options = $request->options;
            foreach ($options as  $option) {
                $op = new QuoteInputOption;
                $op->quote_input_id = $input->id;
                $op->name = $option;
                $op->save();
            }
        }
        Session::flash('success', __('Input field updated successfully') . '!');
        return "success";
    }

    public function options($id)
    {
        return QuoteInputOption::where('quote_input_id', $id)->get();
    }

    public function all()
    {
        $data['quotes'] = Quote::where('user_id',Auth::id())->orderBy('id', 'DESC')->paginate(10);
        return view('user.quote.quote', $data);
    }

    public function pending()
    {
        $data['quotes'] = Quote::where([
            ['status', 0],
            ['user_id', Auth::id()]
        ])->orderBy('id', 'DESC')->paginate(10);
        return view('user.quote.quote', $data);
    }

    public function processing()
    {
        $data['quotes'] = Quote::where([
            ['status', 1],
            ['user_id', Auth::id()]
        ])->orderBy('id', 'DESC')->paginate(10);
        return view('user.quote.quote', $data);
    }

    public function completed()
    {
        $data['quotes'] = Quote::where([
            ['status', 2],
            ['user_id', Auth::id()]
        ])->orderBy('id', 'DESC')->paginate(10);
        return view('user.quote.quote', $data);
    }

    public function rejected()
    {
        $data['quotes'] = Quote::where([
            ['status', 3],
            ['user_id', Auth::id()]
        ])->orderBy('id', 'DESC')->paginate(10);
        return view('user.quote.quote', $data);
    }

    public function status(Request $request)
    {
        $quote = Quote::where('user_id', Auth::user()->id)->where('id', $request->quote_id)->firstOrFail();
        $quote->status = $request->status;
        $quote->save();

        Session::flash('success', __('Status changed successfully') . '!');
        return back();
    }

    public function mail(Request $request)
    {
        $rules = [
            'email' => 'required',
            'subject' => 'required',
            'message' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $be = BE::first();
        $from = Auth::user()->company_name;

        $sub = $request->subject;
        $msg = $request->message;
        $to = $request->email;


        // Send Mail
        $mail = new PHPMailer(true);    
        $mail->CharSet = 'UTF-8';

        if ($be->is_smtp == 1) {
            try {
                $mail->isSMTP();
                $mail->Host = $be->smtp_host;
                $mail->SMTPAuth = true;
                $mail->Username = $be->smtp_username;
                $mail->Password = $be->smtp_password;
                $mail->SMTPSecure = $be->encryption;
                $mail->Port = $be->smtp_port;

                //Recipients
                $mail->setFrom($be->from_mail, $from);
                $mail->addReplyTo(Auth::user()->email, $from);
                $mail->addAddress($to);

                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body = $msg;

                $mail->send();
            } catch (\Exception $e) {
                die($e->getMessage());
            }
        } else {
            try {

                //Recipients
                $mail->setFrom($be->from_mail, $from);
                $mail->addReplyTo(Auth::user()->email, $from);
                $mail->addAddress($to);

                // Content
                $mail->isHTML(true);
                $mail->Subject = $sub;
                $mail->Body = $msg;

                $mail->send();
            } catch (Exception $e) {
            }
        }

        Session::flash('success', __('Mail sent successfully!'));
        return "success";
    }

    public function delete(Request $request)
    {
        Quote::where('user_id', Auth::user()->id)->where('id', $request->quote_id)->firstOrFail()->delete();
        Session::flash('success', __('Quote request deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            Quote::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail()->delete();
        }
        Session::flash('success', __('Quote requests deleted successfully') . '!');
        return "success";
    }
}
