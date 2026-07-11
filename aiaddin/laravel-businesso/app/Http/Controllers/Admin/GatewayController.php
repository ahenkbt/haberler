<?php

namespace App\Http\Controllers\Admin;

use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\Language;
use App\Models\OfflineGateway;
use App\Models\PaymentGateway;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Session;
use Validator;

class GatewayController extends Controller
{
    public function index()
    {
        $data['paypal'] = PaymentGateway::find(15);
        $data['stripe'] = PaymentGateway::find(14);
        $data['paystack'] = PaymentGateway::find(12);
        $data['paytm'] = PaymentGateway::find(11);
        $data['flutterwave'] = PaymentGateway::find(6);
        $data['instamojo'] = PaymentGateway::find(13);
        $data['mollie'] = PaymentGateway::find(17);
        $data['razorpay'] = PaymentGateway::find(9);
        $data['mercadopago'] = PaymentGateway::find(19);
        $data['anet'] = PaymentGateway::find(20);
        $data['phonepe'] = PaymentGateway::where('keyword', 'phonepe')->first();
        $data['perfect_money'] = PaymentGateway::where('keyword', 'perfect_money')->first();
        $data['xendit'] = PaymentGateway::where('keyword', 'xendit')->first();
        $data['myfatoorah'] = PaymentGateway::where('keyword', 'myfatoorah')->first();
        $data['yoco'] = PaymentGateway::where('keyword', 'yoco')->first();
        $data['toyyibpay'] = PaymentGateway::where('keyword', 'toyyibpay')->first();
        $data['paytabs'] = PaymentGateway::where('keyword', 'paytabs')->first();
        $data['iyzico'] = PaymentGateway::where('keyword', 'iyzico')->first();
        $data['midtrans'] = PaymentGateway::where('keyword', 'midtrans')->first();
        return view('admin.gateways.index', $data);
    }

    public function paypalUpdate(Request $request)
    {
        $paypal = PaymentGateway::find(15);
        $paypal->status = $request->status;

        $information = [];
        $information['client_id'] = $request->client_id;
        $information['client_secret'] = $request->client_secret;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = "Pay via your PayPal account.";

        $paypal->information = json_encode($information);

        $paypal->save();

        $request->session()->flash('success', __("Paypal informations updated successfully!"));

        return back();
    }

    public function stripeUpdate(Request $request)
    {
        $stripe = PaymentGateway::find(14);
        $stripe->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['secret'] = $request->secret;
        $information['text'] = "Pay via your Credit account.";

        $stripe->information = json_encode($information);

        $stripe->save();

        $request->session()->flash('success', __("Stripe informations updated successfully!"));

        return back();
    }

    public function paystackUpdate(Request $request)
    {
        $paystack = PaymentGateway::find(12);
        $paystack->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['email'] = $request->email;
        $information['text'] = "Pay via your Paystack account.";

        $paystack->information = json_encode($information);

        $paystack->save();

        $request->session()->flash('success', __("Paystack informations updated successfully!"));

        return back();
    }

    public function paytmUpdate(Request $request)
    {
        $paytm = PaymentGateway::find(11);
        $paytm->status = $request->status;

        $information = [];
        $information['environment'] = $request->environment;
        $information['merchant'] = $request->merchant;
        $information['secret'] = $request->secret;
        $information['website'] = $request->website;
        $information['industry'] = $request->industry;
        $information['text'] = "Pay via your paytm account.";

        $paytm->information = json_encode($information);

        $paytm->save();


        $request->session()->flash('success', __("Paytm informations updated successfully!"));

        return back();
    }

    public function flutterwaveUpdate(Request $request)
    {
        $flutterwave = PaymentGateway::find(6);
        $flutterwave->status = $request->status;

        $information = [];
        $information['public_key'] = $request->public_key;
        $information['secret_key'] = $request->secret_key;
        $information['text'] = "Pay via your Flutterwave account.";

        $flutterwave->information = json_encode($information);

        $flutterwave->save();

        $request->session()->flash('success', __("Flutterwave informations updated successfully!"));

        return back();
    }

    public function instamojoUpdate(Request $request)
    {
        $instamojo = PaymentGateway::find(13);
        $instamojo->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['token'] = $request->token;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = "Pay via your Instamojo account.";

        $instamojo->information = json_encode($information);

        $instamojo->save();

        $request->session()->flash('success', __("Instamojo informations updated successfully!"));

        return back();
    }

    public function mollieUpdate(Request $request)
    {
        $mollie = PaymentGateway::find(17);
        $mollie->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['text'] = "Pay via your Mollie Payment account.";

        $mollie->information = json_encode($information);

        $mollie->save();

        $arr = ['MOLLIE_KEY' => $request->key];
        setEnvironmentValue($arr);
        \Artisan::call('config:clear');

        $request->session()->flash('success', __("Mollie Payment informations updated successfully!"));

        return back();
    }

    public function razorpayUpdate(Request $request)
    {
        $razorpay = PaymentGateway::find(9);
        $razorpay->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['secret'] = $request->secret;
        $information['text'] = "Pay via your Razorpay account.";

        $razorpay->information = json_encode($information);

        $razorpay->save();

        $request->session()->flash('success', __("Razorpay informations updated successfully!"));

        return back();
    }

    public function anetUpdate(Request $request)
    {
        $anet = PaymentGateway::find(20);
        $anet->status = $request->status;

        $information = [];
        $information['login_id'] = $request->login_id;
        $information['transaction_key'] = $request->transaction_key;
        $information['public_key'] = $request->public_key;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = "Pay via your Authorize.net account.";

        $anet->information = json_encode($information);

        $anet->save();

        $request->session()->flash('success', __("Authorize.net informations updated successfully!"));

        return back();
    }

    public function mercadopagoUpdate(Request $request)
    {
        $mercadopago = PaymentGateway::find(19);
        $mercadopago->status = $request->status;

        $information = [];
        $information['token'] = $request->token;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = "Pay via your Mercado Pago account.";

        $mercadopago->information = json_encode($information);

        $mercadopago->save();

        $request->session()->flash('success', __("Mercado Pago informations updated successfully!"));

        return back();
    }
    public function phonepeUpdate(Request $request)
    {
        $phonepe = PaymentGateway::where('keyword', 'phonepe')->first();
        $phonepe->status = $request->status;

        $information = [];
        $information['merchant_id'] = $request->merchant_id;
        $information['salt_key'] = $request->salt_key;
        $information['salt_index'] = $request->salt_index;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = "Pay via your PhonePe account.";

        $phonepe->information = json_encode($information);

        $phonepe->save();

        $request->session()->flash('success', __("PhonePe informations updated successfully!"));

        return back();
    }

    public function perfect_moneyUpdate(Request $request)
    {
        $perfect_money = PaymentGateway::where('keyword', 'perfect_money')->first();
        $perfect_money->status = $request->status;

        $information = [];
        $information['perfect_money_wallet_id'] = $request->perfect_money_wallet_id;
        $perfect_money->information = json_encode($information);

        $perfect_money->save();
        $request->session()->flash('success', __("Perfect Money informations updated successfully!"));
        return back();
    }
    public function xenditUpdate(Request $request)
    {
        $xendit = PaymentGateway::where('keyword', 'xendit')->first();
        $xendit->status = $request->status;

        $information = [];
        $information['secret_key'] = $request->secret_key;
        $xendit->information = json_encode($information);

        $xendit->save();
        $request->session()->flash('success', __("Xendit informations updated successfully!"));
        return back();
    }

    public function myfatoorahUpdate(Request $request)
    {
        $information = [
            'token' => $request->token,
            'sandbox_status' => $request->sandbox_status
        ];

        $data = PaymentGateway::where('keyword', 'myfatoorah')->first();
        $data->information = json_encode($information);
        $data->status = $request->status;
        $data->save();


        $array = [
            'MYFATOORAH_TOKEN' => $request->token,
            'MYFATOORAH_CALLBACK_URL' => route('myfatoorah.success'),
            'MYFATOORAH_ERROR_URL' => route('myfatoorah.cancel'),
        ];

        setEnvironmentValue($array);
        Artisan::call('config:clear');

        Session::flash('success', __('Updated Myfatoorah Information Successfully'));
        return back();
    }
    public function yocoUpdate(Request $request)
    {
        $yoco = PaymentGateway::where('keyword', 'yoco')->first();
        $yoco->status = $request->status;

        $information = [];
        $information['secret_key'] = $request->secret_key;
        $yoco->information = json_encode($information);

        $yoco->save();
        $request->session()->flash('success', __("Yoco informations updated successfully!"));
        return back();
    }

    public function toyyibpayUpdate(Request $request)
    {
        $information['sandbox_status'] = $request->sandbox_status;
        $information['secret_key'] = $request->secret_key;
        $information['category_code'] = $request->category_code;

        $data = PaymentGateway::where('keyword', 'toyyibpay')->first();
        $data->information = json_encode($information);
        $data->status = $request->status;
        $data->save();
       

        Session::flash('success', __('Updated Toyyibpay Information Successfully'));
        return redirect()->back();
    }

    public function paytabsUpdate(Request $request)
    {
        $information['server_key'] = $request->server_key;
        $information['profile_id'] = $request->profile_id;
        $information['country'] = $request->country;
        $information['api_endpoint'] = $request->api_endpoint;

        $data = PaymentGateway::where('keyword', 'paytabs')->first();
        $data->information = json_encode($information);
        $data->status = $request->status;
        $data->save();

        Session::flash('success', __('Updated Paytabs Information Successfully'));

        return redirect()->back();
    }

    public function iyzicoUpdate(Request $request)
    {
        $information['sandbox_status'] = $request->sandbox_status;
        $information['api_key'] = $request->api_key;
        $information['secret_key'] = $request->secret_key;

        $data = PaymentGateway::where('keyword', 'iyzico')->first();
        $data->information = json_encode($information);
        $data->status = $request->status;
        $data->save();


        Session::flash('success', __('Updated Iyzico Information Successfully'));

        return redirect()->back();
    }
    public function midtransUpdate(Request $request)
    {
        $information['is_production'] = $request->is_production;
        $information['server_key'] = $request->server_key;

        $data = PaymentGateway::where('keyword', 'midtrans')->first();
        $data->information = json_encode($information);
        $data->status = $request->status;
        $data->save();

        Session::flash('success', __('Updated Midtrans Information Successfully'));

        return redirect()->back();
    }

    public function offline(Request $request)
    {
        $data['ogateways'] = OfflineGateway::orderBy('id', 'DESC')->get();

        return view('admin.gateways.offline.index', $data);
    }

    public function store(Request $request)
    {

        $rules = [
            'name' => 'required|max:100',
            'short_description' => 'nullable',
            'serial_number' => 'required|integer',
            'is_receipt' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $in = $request->all();

        OfflineGateway::create($in);

        Session::flash('success', __('Gateway added successfully!'));
        return "success";
    }

    public function update(Request $request)
    {

        $rules = [
            'name' => 'required|max:100',
            'short_description' => 'nullable',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $in = $request->except('_token', 'ogateway_id');

        OfflineGateway::where('id', $request->ogateway_id)->update($in);

        Session::flash('success', __('Gateway updated successfully!'));
        return "success";
    }

    public function status(Request $request)
    {
        $og = OfflineGateway::find($request->ogateway_id);
        $og->status = $request->status;
        $og->save();

        Session::flash('success', __('Gateway status changed successfully!'));
        return back();
    }

    public function delete(Request $request)
    {
        $ogateway = OfflineGateway::findOrFail($request->ogateway_id);
        $ogateway->delete();

        Session::flash('success', __('Gateway deleted successfully!'));
        return back();
    }
}
