<?php

namespace App\Http\Controllers\User\DonationManagement;

use App\Constants\Constant;
use App\Exports\DonationExport;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Http\Requests\User\DonationManagement\StoreCause;
use App\Http\Requests\User\DonationManagement\UpdateCause;
use App\Models\User\BasicSetting;
use App\Models\User\DonationManagement\Donation;
use App\Models\User\DonationManagement\DonationContent;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\Language;
use App\Models\User\UserEmailTemplate;
use App\Models\User\UserOfflineGateway;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Carbon\Carbon;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Session;
use Mews\Purifier\Facades\Purifier;
use PDF;
use Maatwebsite\Excel\Facades\Excel;
use PHPMailer\PHPMailer\PHPMailer;
use WpOrg\Requests\Auth\Basic;

class DonationController extends Controller
{
    use MiscellaneousTrait;
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $userId = Auth::guard('web')->user()->id;

        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $lang_id = $lang->id;
        $data['lang_id'] = $lang_id;
        $data['abx'] = $lang->basic_extra;

        $donations = DonationContent::where('language_id', $lang->id)->select('id', 'donation_id', 'title', 'slug', 'content')->get();
        $donations->map(function ($content) use ($lang) {
            $raised_amount = DonationDetail::query()
                ->where('donation_id', '=', $content->donation_id)
                ->where('status', '=', "completed")
                ->sum('amount');
            $donation['raised_amount'] = $raised_amount > 0 ? round($raised_amount, 2) : 0;
        });

        $data['donations'] = $donations;
        return view('user.donation_management.donation.index', $data);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        $data['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo(Auth::guard('web')->user()->id);
        $data['languages'] = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $data['defaultLang'] = $data['languages']->where('dashboard_default', 1)->first();
        return view('user.donation_management.donation.create', $data);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return \Illuminate\Http\Response
     */
    public function store(StoreCause $request)
    {

        $image = Uploader::upload_picture(Constant::WEBSITE_CAUSE_IMAGE, $request->image);

        $userId = Auth::guard('web')->user()->id;
        $donation = Donation::create([
            'user_id' => $userId,
            'goal_amount' => $request->goal_amount,
            'min_amount' => $request->min_amount,
            'custom_amount' => $request->custom_amount,
            'image' => $image,
        ]);

        $languages = Language::where('user_id', $userId)->get();

        foreach ($languages as $language) {
            $causeContent = new DonationContent();
            $causeContent->user_id = $userId;
            $causeContent->language_id = $language->id;
            $causeContent->donation_id = $donation->id;
            $causeContent->donation_category_id = $request[$language->code . '_category_id'];
            $causeContent->title = $request[$language->code . '_title'];
            $causeContent->slug = make_slug($request[$language->code . '_title']);

            $causeContent->content = Purifier::clean($request[$language->code . '_content']);
            $causeContent->meta_keywords = $request[$language->code . '_meta_keywords'];
            $causeContent->meta_description = $request[$language->code . '_meta_description'];
            $causeContent->save();
        }
        session()->flash('success', __('New donation cause created successfully') . '!');
        return "success";
    }

    /**
     * Display the specified resource.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  int  $id
     * @return
     */
    public function edit($id)
    {

        $userId = Auth::guard('web')->user()->id;

        $data['donation'] = Donation::findOrFail($id);
        $languages = Language::query()->where('user_id', $userId)->get();
        $data['languages'] = $languages;
        $data['defaultLang'] = $languages->where('dashboard_default', 1)->first();
        $data['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo($userId);
        return view('user.donation_management.donation.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return
     */
    public function update(UpdateCause $request, $id)
    {
        $donation = Donation::where('user_id', Auth::guard('web')->user()->id)->find($id);

        // store new thumbnail image in storage
        if ($request->hasFile('image')) {
            $imageName = Uploader::update_picture(Constant::WEBSITE_CAUSE_IMAGE, $request->file('image'), basename($donation->image));
        }

        // update data in db
        $donation->update($request->except('image') + [
            'image' => $request->hasFile('image') ? $imageName : $donation->image,

        ]);

        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        foreach ($languages as $language) {
            DonationContent::updateOrCreate([

                'id' => $request[$language->code . '_donation_content'],

            ], [
                'donation_id' => $id,
                'user_id' => Auth::guard('web')->user()->id,
                'language_id' => $language->id,
                'donation_category_id' => $request[$language->code . '_category_id'],
                'title' => $request[$language->code . '_title'],
                'slug' => make_slug($request[$language->code . '_title']),
                'content' => Purifier::clean($request[$language->code . '_content']),
                'meta_keywords' => $request[$language->code . '_meta_keywords'],
                'meta_description' => $request[$language->code . '_meta_description']
            ]);
        }

        Session::flash('success', __('Donation updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\Response
     */
    public function destroy($id)
    {
        //
    }


    public function delete(Request $request)
    {
        $donation_details = DonationDetail::query()->where([['donation_id', $request->donation_id], ['user_id', Auth::guard('web')->user()->id]])->get();
        foreach ($donation_details as $donation_detail) {
            if (!is_null($donation_detail->receipt)) {
                $directory = public_path(Constant::WEBSITE_DONATION_ATTACHMENT . '/' . $donation_detail->receipt);
                if (file_exists($directory)) {
                    @unlink($directory);
                }
            }
            $donation_detail->delete();
        }
        $donation =  Donation::findOrFail($request->donation_id);
        $donation->contents()->delete();

        if (!is_null($donation->image)) {
            $directory = public_path(Constant::WEBSITE_CAUSE_IMAGE . "/" . $donation->image);
            if (file_exists($directory)) {
                @unlink($directory);
            }
        }

        $donation->delete();
        Session::flash('success', __('Donation deleted successfully') . '!');
        return back();
    }
    public function paymentDelete(Request $request)
    {
        $donation_detail = DonationDetail::findOrFail($request->payment_id);
        if (!is_null($donation_detail->receipt)) {
            $directory = public_path(Constant::WEBSITE_DONATION_ATTACHMENT) . "/" . $donation_detail->receipt;
            if (file_exists($directory)) {
                @unlink($directory);
            }
        }
        $donation_detail->delete();
        Session::flash('success', __('Payment deleted successfully') . '!');
        return back();
    }
    public function bulkPaymentDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            $donation_detail = DonationDetail::findOrFail($id);
            if (!is_null($donation_detail->receipt)) {
                $directory =  public_path("assets/front/img/donations/receipt/" . $donation_detail->receipt);
                if (file_exists($directory)) {
                    @unlink($directory);
                }
            }
            $donation_detail->delete();
        }

        Session::flash('success', __('Donations deleted successfully') . '!');
        return "success";
    }


    public function bulkDelete(Request $request)
    {
        return DB::transaction(function () use ($request) {
            $ids = $request->ids;
            foreach ($ids as $id) {
                $donation_details = DonationDetail::query()->where('donation_id', $id)->get();
                foreach ($donation_details as $donation_detail) {
                    if (!is_null($donation_detail->receipt)) {
                        $directory =  public_path(Constant::WEBSITE_DONATION_ATTACHMENT . '/' . $donation_detail->receipt);
                        if (file_exists($directory)) {
                            @unlink($directory);
                        }
                    }
                    $donation_detail->delete();
                }
                $donation = Donation::findOrFail($id);
                if (!is_null($donation->image)) {
                    $directory = public_path(Constant::WEBSITE_CAUSE_IMAGE . "/" . $donation->image);
                    if (file_exists($directory)) {
                        @unlink($directory);
                    }
                }

                $this->deleteFromMegaMenu($donation);

                $donation->delete();
            }
            Session::flash('success', __('Donation deleted successfully') . '!');
            return "success";
        });
    }

    public function paymentLog(Request $request)
    {
        $userId = Auth::guard('web')->user()->id;
        // $lang = Language::where([['user_id', $userId], ['code', $request->language]])->first();
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();
        
        $search = $request->search;
        $donations = DonationDetail::where('user_id', $userId)->when($search, function ($query, $search) {
            return $query->where('transaction_id', $search);
        })
            ->orderBy('id', 'DESC')
            ->paginate(10);


        $data['donations'] = $donations;
        return view('user.donation_management.payment.index', $data);
    }
    public function paymentLogUpdate(Request $request)
    {
        $donation = DonationDetail::query()->findOrFail($request->id);
        if ($request->status == "success") {

            if ($donation->email) {
                $fileName = $this->makeInvoices($donation);
                $donation->update(['status' => 'completed', 'invoice' => $fileName]);
                $this->sendMailPHPMailer($donation);
            } else {
                $donation->update(['status' => 'completed']);
            }
            Session::flash('success', __('Donation payment updated successfully') . '!');
        } elseif ($request->status == "rejected") {
            $donation->update(['status' => 'rejected']);
            Session::flash('success', __('Donation payment rejected successfully') . '!');
        } else {
            $donation->update(['status' => 'pending']);
            Session::flash('success', __('Donation payment to pending successfully') . '!');
        }

        return redirect()->back();
    }
    public function makeInvoices($donation)
    {
        $userId = Auth::guard('web')->user()->id;
        $fileName = $donation->transaction_id . ".pdf";

        $directory = public_path(Constant::WEBSITE_DONATION_INVOICE . '/');
        if (!file_exists($directory)) {
            mkdir($directory, 0775, true);
        }
        $fileLocated = $directory . $fileName;

        $language = $this->getUserCurrentLanguage($userId);
        $cause = Donation::query()
            ->where('id', $donation->donation_id)
            ->firstOrFail();
        $causeInfo = DonationContent::query()
            ->where('user_id', $userId)
            ->where('donation_id', $cause->id)
            ->where('language_id', $language->id)
            ->select('title')
            ->firstOrFail();

        PDF::loadView('pdf.donation', compact('donation', 'causeInfo'))->save($fileLocated);
        return $fileName;
    }

    public function sendMailPHPMailer($donationInfo)
    {
        $userId = Auth::guard('web')->user()->id;
        $mailTemplate = UserEmailTemplate::query()
            ->where('email_type', 'donation_approved')
            ->where('user_id', $userId)
            ->first();
        $mailSubject = $mailTemplate->email_subject;
        $mailBody = $mailTemplate->email_body;

        // second get the website title & mail's smtp info from db
        $be = DB::table('basic_extendeds')
            ->select('is_smtp', 'smtp_host', 'smtp_username', 'smtp_password', 'from_mail', 'from_name')
            ->first();

        $userBs = BasicSetting::query()->where('user_id', $userId)
            ->select('website_title', 'email', 'from_name')
            ->first();

        $language = $this->getUserCurrentLanguage($userId);
        $cause = Donation::query()
            ->where('id', $donationInfo->donation_id)
            ->firstOrFail();
        $causeInfo = DonationContent::query()
            ->where('user_id', $userId)
            ->where('donation_id', $cause->id)
            ->where('language_id', $language->id)
            ->select('title')
            ->firstOrFail();

        $websiteTitle = $userBs->website_title;
        $mailBody = str_replace('{donor_name}', $donationInfo->name, $mailBody);
        $mailBody = str_replace('{cause_name}', $causeInfo->title, $mailBody);
        $mailBody = str_replace('{website_title}', $websiteTitle, $mailBody);


        // initialize a new mail
        $mail = new PHPMailer(true);
        $mail->CharSet = 'UTF-8';
        $mail->Encoding = 'base64';

        // if smtp status == 1, then set some value for PHPMailer
        if ($be->is_smtp == 1) {
            $mail->isSMTP();
            $mail->Host = $be->smtp_host;
            $mail->SMTPAuth = true;
            $mail->Username = $be->smtp_username;
            $mail->Password = $be->smtp_password;
            // if ($be->encryption == 'TLS') {
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_STARTTLS;
            // }
            $mail->Port = 587;
        }
        // finally, add other informations and send the mail
        try {
            // Recipients
            $mail->setFrom($be->from_mail, $userBs->from_name);
            $mail->addReplyTo($userBs->email, $userBs->from_name);
            $mail->addAddress($donationInfo->email);
            $path = public_path(Constant::WEBSITE_DONATION_INVOICE . '/' . $donationInfo->invoice);
            // Attachments (Invoice)

            $mail->addAttachment($path);
            // Content
            $mail->isHTML(true);
            $mail->Subject = $mailSubject;
            $mail->Body = $mailBody;
            $mail->send();
            @unlink(public_path(Constant::WEBSITE_DONATION_INVOICE) . '/' . $donationInfo->invoice);
            return;
        } catch (\Exception $e) {
            return session()->flash('error', __('Mail could not be sent') . '!');
        }
    }

    public function settings()
    {
        $userId = Auth::guard('web')->user()->id;
        $data['abex'] =  DB::table('user_donation_settings')->where('user_id', $userId)->first();
        if (is_null($data['abex'])) {
            DB::table('user_donation_settings')->insert([
                'user_id' => $userId
            ]);
            $data['abex'] =  DB::table('user_donation_settings')->where('user_id', $userId)->first();
        }

        return view('user.donation_management.settings', $data);
    }

    public function updateSettings(Request $request)
    {
        $donationSetting = DB::table('user_donation_settings')->where('user_id', Auth::guard('web')->user()->id)->update([
            'donation_guest_checkout' => $request->donation_guest_checkout,
            'is_donation' => $request->is_donation
        ]);

        session()->flash('success', __('Settings updated successfully') . '!');
        return back();
    }

    public function report(Request $request)
    {
        $user = Auth::guard('web')->user();
        $data['curencyInfo'] = MiscellaneousTrait::getCurrencyInfo($user->id);
        $currentLang = $this->getUserCurrentLanguage($user->id);

        $fromDate = $request->from_date;
        $toDate = $request->to_date;
        $paymentStatus = $request->payment_status;
        $paymentMethod = $request->payment_method;

        if (!empty($fromDate) && !empty($toDate)) {
            $donations = DonationDetail::where('user_id', $user->id)->when($fromDate, function ($query, $fromDate) {
                return $query->whereDate('created_at', '>=', Carbon::parse($fromDate));
            })->when($toDate, function ($query, $toDate) {
                return $query->whereDate('created_at', '<=', Carbon::parse($toDate));
            })->when($paymentMethod, function ($query, $paymentMethod) {
                return $query->where('payment_method', $paymentMethod);
            })->when($paymentStatus, function ($query, $paymentStatus) {
                return $query->where('status', $paymentStatus);
            })->select('transaction_id', 'donation_id', 'name', 'email', 'phone', 'amount', 'payment_method', 'status', 'created_at')->orderBy('id', 'DESC');

            $_donates = $donations->get();
            $_donates->map(function ($donation) use ($currentLang) {
                $title =  $donation->cause->contents()->where('language_id', $currentLang->id)->select('title')->first();
                $donation['title'] = $title->title;
            });
            Session::put('donation_report', $_donates);

            $donations =  $donations->paginate(10);
            $donations->map(function ($donation) use ($currentLang) {
                $title =  $donation->cause->contents()->where('language_id', $currentLang->id)->select('title')->first();
                $donation['title'] = $title->title;
            });


            $data['donations'] = $donations;
        } else {
            Session::put('donation_report', []);
            $data['donations'] = [];
        }

        $data['onPms'] = UserPaymentGeteway::where([['user_id', $user->id], ['status', 1]])->get();
        $data['offPms'] = UserOfflineGateway::where([['user_id', $user->id], ['item_checkout_status', 1]])->get();


        return view('user.donation_management.report', $data);
    }

    public function exportReport()
    {
        $donations = Session::get('donation_report');
        if (empty($donations) || count($donations) == 0) {
            Session::flash('warning', __('There are no donations to export') . '.');
            return back();
        }
        return Excel::download(new DonationExport($donations), 'dontaions.csv');
    }
}
