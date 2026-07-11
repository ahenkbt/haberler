<?php

namespace App\Http\Controllers\User;

use Validator;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Models\User\UserOfflineGateway;
use Illuminate\Support\Facades\Auth;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Models\User\UserShopSetting;

class GatewayController extends Controller
{
    public function index()
    {
        $data['paypal'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paypal']])->first();
        $data['stripe'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'stripe']])->first();
        
        $data['paystack'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paystack']])->first();
       
        $data['paytm'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paytm']])->first();
        $data['flutterwave'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'flutterwave']])->first();
        $data['instamojo'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'instamojo']])->first();
        $data['mollie'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'mollie']])->first();
        $data['razorpay'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'razorpay']])->first();
        $data['mercadopago'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'mercadopago']])->first();
        $data['anet'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'authorize.net']])->first();
        $data['phonepe'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'phonepe']])->first();
        $data['perfect_money'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'perfect_money']])->first();
        $data['xendit'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'xendit']])->first();
        $data['yoco'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'yoco']])->first();
        $data['midtrans'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'midtrans']])->first();
        $data['myfatoorah'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'myfatoorah']])->first();
        $data['iyzico'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'iyzico']])->first();
        $data['toyyibpay'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'toyyibpay']])->first();
        $data['paytabs'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paytabs']])->first();
        $data['phonepe'] = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'phonepe']])->first();
        // dd($data);
        return view('user.gateways.index', $data);
    }

    public function paypalUpdate(Request $request)
    {
        $paypal = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paypal']])->first();
        $paypal->status = $request->status;

        $information = [];
        $information['client_id'] = $request->client_id;
        $information['client_secret'] = $request->client_secret;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = __('Pay via your PayPal account') . ".";

        $paypal->information = json_encode($information);

        $paypal->save();

        $request->session()->flash('success', __('Paypal informations updated successfully') . "!");

        return back();
    }

    public function stripeUpdate(Request $request)
    {
        $stripe = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'stripe']])->first();
        $stripe->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['secret'] = $request->secret;
        $information['text'] = __('Pay via your Credit account') . ".";

        $stripe->information = json_encode($information);

        $stripe->save();

        $request->session()->flash('success', __('Stripe informations updated successfully') . "!");

        return back();
    }

    public function paystackUpdate(Request $request)
    {
        $paystack = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paystack']])->first();
       
        $paystack->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['email'] = $request->email;
        $information['text'] = __('Pay via your Paystack account') . ".";

        $paystack->information = json_encode($information);

        $paystack->save();

        $request->session()->flash('success', __('Paystack informations updated successfully') . "!");

        return back();
    }

    public function paytmUpdate(Request $request)
    {
        $paytm = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paytm']])->first();
        $paytm->status = $request->status;

        $information = [];
        $information['environment'] = $request->environment;
        $information['merchant'] = $request->merchant;
        $information['secret'] = $request->secret;
        $information['website'] = $request->website;
        $information['industry'] = $request->industry;
        $information['text'] = __('Pay via your paytm account') . ".";

        $paytm->information = json_encode($information);

        $paytm->save();


        $request->session()->flash('success', __('Paytm informations updated successfully') . "!");

        return back();
    }

    public function flutterwaveUpdate(Request $request)
    {
        $flutterwave = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'flutterwave']])->first();
        $flutterwave->status = $request->status;

        $information = [];
        $information['public_key'] = $request->public_key;
        $information['secret_key'] = $request->secret_key;
        $information['text'] = __('Pay via your Flutterwave account') . ".";

        $flutterwave->information = json_encode($information);

        $flutterwave->save();

        $request->session()->flash('success', __('Flutterwave informations updated successfully') . "!");

        return back();
    }

    public function instamojoUpdate(Request $request)
    {
        $instamojo = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'instamojo']])->first();
        $instamojo->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['token'] = $request->token;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = __('Pay via your Instamojo account') . ".";

        $instamojo->information = json_encode($information);

        $instamojo->save();

        $request->session()->flash('success', __('Instamojo informations updated successfully') . "!");

        return back();
    }

    public function mollieUpdate(Request $request)
    {
        $mollie = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'mollie']])->first();
       
        $mollie->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['text'] = __('Pay via your Mollie Payment account') . ".";

        $mollie->information = json_encode($information);

        $mollie->save();

        $arr = ['MOLLIE_KEY' => $request->key];
        setEnvironmentValue($arr);
        \Artisan::call('config:clear');

        $request->session()->flash('success', __('Mollie Payment informations updated successfully') . "!");

        return back();
    }

    public function razorpayUpdate(Request $request)
    {
        $razorpay = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'razorpay']])->first();
        $razorpay->status = $request->status;

        $information = [];
        $information['key'] = $request->key;
        $information['secret'] = $request->secret;
        $information['text'] = __('Pay via your Razorpay account') . ".";

        $razorpay->information = json_encode($information);

        $razorpay->save();

        $request->session()->flash('success', __('Razorpay informations updated successfully') . "!");

        return back();
    }

    public function anetUpdate(Request $request)
    {
        $anet = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'authorize.net']])->first();
        $anet->status = $request->status;

        $information = [];
        $information['login_id'] = $request->login_id;
        $information['transaction_key'] = $request->transaction_key;
        $information['public_key'] = $request->public_key;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = __('Pay via your Authorize.net account') . ".";

        $anet->information = json_encode($information);

        $anet->save();

        $request->session()->flash('success', __('Authorize.net informations updated successfully') . "!");

        return back();
    }

    public function mercadopagoUpdate(Request $request)
    {
        $mercadopago = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'mercadopago']])->first();
        $mercadopago->status = $request->status;

        $information = [];
        $information['token'] = $request->token;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = __('Pay via your Mercado Pago account') . ".";

        $mercadopago->information = json_encode($information);

        $mercadopago->save();

        $request->session()->flash('success', __('Mercado Pago informations updated successfully') . "!");

        return back();
    }
    public function phonepeUpdate(Request $request)
    {
        $phonepe = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'phonepe']])->first();
        if (empty($phonepe)) {
            $phonepe = new UserPaymentGeteway();
            $phonepe->name = 'PhonePe';
            $phonepe->keyword = 'phonepe';
            $phonepe->type = 'automatic';
            $phonepe->user_id = Auth::guard('web')->user()->id;
        }
        $phonepe->status = $request->status;

        $information = [];
        $information['merchant_id'] = $request->merchant_id;
        $information['salt_key'] = $request->salt_key;
        $information['salt_index'] = $request->salt_index;
        $information['sandbox_check'] = $request->sandbox_check;
        $information['text'] = __('Pay via your PhonePe account') . ".";

        $phonepe->information = json_encode($information);
        $phonepe->save();

        $request->session()->flash('success', __('PhonePe informations updated successfully') . "!");

        return back();
    }

    public function perfectMoneyUpdate(Request $request)
    {
        $phonepe = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'perfect_money']])->first();
        if (empty($phonepe)) {
            $phonepe = new UserPaymentGeteway();
            $phonepe->name = 'Perfect Money';
            $phonepe->keyword = 'perfect_money';
            $phonepe->type = 'automatic';
            $phonepe->user_id = Auth::guard('web')->user()->id;
        }
        $phonepe->status = $request->status;

        $information = [];
        $information['perfect_money_wallet_id'] = $request->perfect_money_wallet_id;
        $information['text'] = __('Pay via your Perfect Money account') . ".";

        $phonepe->information = json_encode($information);
        $phonepe->save();

        $request->session()->flash('success', __('Perfect Money informations updated successfully') . "!");

        return back();
    }

    public function xenditUpdate(Request $request)
    {
        $xendit = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'xendit']])->first();
        if (empty($xendit)) {
            $xendit = new UserPaymentGeteway();
            $xendit->name = 'Xendit';
            $xendit->keyword = 'xendit';
            $xendit->type = 'automatic';
            $xendit->user_id = Auth::guard('web')->user()->id;
        }
        $xendit->status = $request->status;

        $information = [];
        $information['secret_key'] = $request->secret_key;
        $information['text'] = __('Pay via your xendit account') . ".";

        $xendit->information = json_encode($information);
        $xendit->save();

        $request->session()->flash('success', __('Xendit informations updated successfully') . "!");

        return back();
    }

    public function yocoUpdate(Request $request)
    {
        $yoco = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'yoco']])->first();
        if (empty($yoco)) {
            $yoco = new UserPaymentGeteway();
            $yoco->name = 'Yoco';
            $yoco->keyword = 'yoco';
            $yoco->type = 'automatic';
            $yoco->user_id = Auth::guard('web')->user()->id;
        }
        $yoco->status = $request->status;

        $information = [];
        $information['secret_key'] = $request->secret_key;
        $information['text'] = __('Pay via your yoco account') . ".";

        $yoco->information = json_encode($information);
        $yoco->save();

        $request->session()->flash('success', __('Yoco informations updated successfully') . "!");

        return back();
    }

    public function midtransUpdate(Request $request)
    {
        $midtrans = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'midtrans']])->first();
        if (empty($midtrans)) {
            $midtrans = new UserPaymentGeteway();
            $midtrans->name = 'Midtrans';
            $midtrans->keyword = 'midtrans';
            $midtrans->type = 'automatic';
            $midtrans->user_id = Auth::guard('web')->user()->id;
        }
        $midtrans->status = $request->status;

        $information = [];
        $information['is_production'] = $request->is_production;
        $information['server_key'] = $request->server_key;
        $information['text'] = __('Pay via your midtrans account') . ".";

        $midtrans->information = json_encode($information);
        $midtrans->save();

        $request->session()->flash('success', __('midtrans informations updated successfully') . "!");

        return back();
    }

    public function myfatoorahUpdate(Request $request)
    {
        $myfatoorah = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'myfatoorah']])->first();
        if (empty($myfatoorah)) {
            $myfatoorah = new UserPaymentGeteway();
            $myfatoorah->name = 'MyFatoorah';
            $myfatoorah->keyword = 'myfatoorah';
            $myfatoorah->type = 'automatic';
            $myfatoorah->user_id = Auth::guard('web')->user()->id;
        }
        $myfatoorah->status = $request->status;

        $information = [];
        $information['token'] = $request->token;
        $information['sandbox_status'] = $request->sandbox_status;
        $information['text'] = __('Pay via your myfatoorah account') . ".";

        $myfatoorah->information = json_encode($information);
        $myfatoorah->save();

        $request->session()->flash('success', __('myfatoorah informations updated successfully') . "!");

        return back();
    }
    public function iyzicoUpdate(Request $request)
    {
        $iyzico = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'iyzico']])->first();
        if (empty($iyzico)) {
            $iyzico = new UserPaymentGeteway();
            $iyzico->name = 'Iyzico';
            $iyzico->keyword = 'iyzico';
            $iyzico->type = 'automatic';
            $iyzico->user_id = Auth::guard('web')->user()->id;
        }
        $iyzico->status = $request->status;

        $information = [];
        $information['sandbox_status'] = $request->sandbox_status;
        $information['api_key'] = $request->api_key;
        $information['secret_key'] = $request->secret_key;
        $information['text'] = __('Pay via your iyzico account') . ".";

        $iyzico->information = json_encode($information);
        $iyzico->save();

        $request->session()->flash('success', __('iyzico informations updated successfully') . "!");

        return back();
    }
    public function toyyibpayUpdate(Request $request)
    {
        $toyyibpay = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'toyyibpay']])->first();
        if (empty($toyyibpay)) {
            $toyyibpay = new UserPaymentGeteway();
            $toyyibpay->name = 'Toyyibpay';
            $toyyibpay->keyword = 'toyyibpay';
            $toyyibpay->type = 'automatic';
            $toyyibpay->user_id = Auth::guard('web')->user()->id;
        }
        $toyyibpay->status = $request->status;

        $information = [];
        $information['sandbox_status'] = $request->sandbox_status;
        $information['secret_key'] = $request->secret_key;
        $information['category_code'] = $request->category_code;
        $information['text'] = __('Pay via your toyyibpay account') . ".";

        $toyyibpay->information = json_encode($information);
        $toyyibpay->save();

        $request->session()->flash('success', __('toyyibpay informations updated successfully') . "!");

        return back();
    }
    public function paytabsUpdate(Request $request)
    {
        $paytabs = UserPaymentGeteway::where([['user_id', Auth::guard('web')->user()->id], ['keyword', 'paytabs']])->first();
        if (empty($paytabs)) {
            $paytabs = new UserPaymentGeteway();
            $paytabs->name = 'Paytabs';
            $paytabs->keyword = 'paytabs';
            $paytabs->type = 'automatic';
            $paytabs->user_id = Auth::guard('web')->user()->id;
        }
        $paytabs->status = $request->status;

        $information = [];
        $information['server_key'] = $request->server_key;
        $information['profile_id'] = $request->profile_id;
        $information['country'] = $request->country;
        $information['api_endpoint'] = $request->api_endpoint;
        $information['text'] = __('Pay via your paytabs account') . ".";

        $paytabs->information = json_encode($information);
        $paytabs->save();

        $request->session()->flash('success', __('paytabs informations updated successfully') . "!");

        return back();
    }

    public function offline(Request $request)
    {
        $userId = Auth::guard('web')->user()->id;
        $data['ogateways'] = UserOfflineGateway::where('user_id', Auth::guard('web')->user()->id)->orderBy('id', 'DESC')->get();
        $data['shopsettings'] = UserShopSetting::where('user_id', $userId)->first();

        return view('user.gateways.offline.index', $data);
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
        $in['user_id'] = Auth::guard('web')->user()->id;
        $in['item_checkout_status'] = 1;
        UserOfflineGateway::create($in);
        Session::flash('success', __('Gateway added successfully') . '!');
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
        UserOfflineGateway::where('id', $request->ogateway_id)->update($in);
        Session::flash('success', __('Gateway updated successfully') . '!');
        return "success";
    }
    public function status(Request $request)
    {
        $og = UserOfflineGateway::find($request->ogateway_id);
        if (!empty($request->type) && $request->type == 'item') {
            $og->item_checkout_status = $request->item_checkout_status;
        }
        $og->save();
        Session::flash('success', __('Gateway status changed successfully') . '!');
        return back();
    }

    public function delete(Request $request)
    {
        $ogateway = UserOfflineGateway::findOrFail($request->ogateway_id);
        $ogateway->delete();
        Session::flash('success', __('Gateway deleted successfully') . '!');
        return back();
    }
}
