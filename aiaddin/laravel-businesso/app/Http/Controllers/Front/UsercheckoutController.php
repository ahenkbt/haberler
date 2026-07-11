<?php

namespace App\Http\Controllers\Front;

use Illuminate\Http\Request;
use App\Models\User\Language;
use App\Models\User\UserItem;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Models\User\UserItemContent;
use App\Models\User\UserItemVariation;
use App\Models\User\UserOfflineGateway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Http\Controllers\User\Payment\PaytmController;
use App\Http\Controllers\User\Payment\MollieController;
use App\Http\Controllers\User\Payment\PaypalController;
use App\Http\Controllers\User\Payment\StripeController;
use App\Http\Controllers\User\Payment\PaystackController;
use App\Http\Controllers\User\Payment\RazorpayController;
use App\Http\Controllers\User\Payment\InstamojoController;
use App\Http\Controllers\User\Payment\FlutterWaveController;
use App\Http\Controllers\User\Payment\MercadopagoController;
use App\Http\Controllers\User\Payment\AuthorizenetController;
use App\Http\Controllers\User\Payment\PerfectMoneyController;
use App\Http\Controllers\User\Payment\PhonePeController;
use App\Http\Controllers\User\Payment\XenditController;
use App\Http\Controllers\User\Payment\YocoController;
use App\Http\Controllers\User\Payment\ToyyibpayController;
use App\Http\Controllers\User\Payment\PaytabsController;
use App\Http\Controllers\User\Payment\MidtransController;
use App\Http\Controllers\User\Payment\IyzicoController;
use App\Http\Controllers\User\Payment\MyFatoorahController;
use App\Http\Controllers\User\Payment\ShopMyFatoorahController;

class UsercheckoutController extends Controller
{

    public function __construct()
    {
        $this->middleware('auth:customer');
    }


    public function checkout($domain, Request $request)
    {


        if (!Session::has('cart')) {
            return view('errors.404');
        }
        $user = getUser();
        if (session()->has('user_lang')) {
            $userCurrentLang = Language::where('code', session()->get('user_lang'))->where('user_id', $user->id)->firstOrFail();
            if (empty($userCurrentLang)) {
                $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->firstOrFail();
                session()->put('user_lang', $userCurrentLang->code);
            }
        } else {
            $userCurrentLang = Language::where('is_default', 1)->where('user_id', $user->id)->firstOrFail();
        }

        $cart = Session::get('cart');
        $items = [];
        $qty = [];
        $st_errors = [];
        $variations = [];
        foreach ($cart as $id => $c_item) {
            // check stock quantity without variation
            $item = UserItem::findOrFail($c_item['id']);
            if ($c_item["variations"] == null) {
                if ($item->type == 'physical') {
                    if ($item->stock < $c_item['qty']) {
                        $st_errors[] = $c_item["name"];
                    }
                }
            } else {
                $itemcontent = UserItemContent::where('item_id', $item->id)->where('language_id', $userCurrentLang->id)->first();
                $orderderd_variations = $c_item["variations"];

                foreach ($orderderd_variations as $vkey => $value) {
                    $db_variations = UserItemVariation::where('variant_name', $vkey)->where('item_id', $itemcontent->item_id)->first();
                    if ($db_variations) {
                        $db_option = json_decode($db_variations->option_name);
                        $db_stock = json_decode($db_variations->option_stock);
                        foreach ($db_option as $opkey => $opval) {
                            if ($value["name"] == $opval) {
                                if ($db_stock[$opkey] < $c_item['qty']) {
                                    $st_errors[] = '"' . $vkey . ':' . ' ' . $value["name"] . '"' . " of " . $c_item["name"];
                                }
                            }
                        }
                    }
                }
            }
        }
        if (count($st_errors)) {
            return redirect()->back()->with('st_errors', $st_errors);
        }
        $total = $this->orderTotal($request->shipping_charge);
        // return $request;
        if ($this->orderValidation($request)) {
            return $this->orderValidation($request);
        }
        $bs = BasicSetting::where('user_id', $user->id)->firstorFail();
        $input = $request->all();
        $offline_payment_gateways = UserOfflineGateway::where('user_id', $user->id)->where('item_checkout_status', 1)->pluck('name')->toArray();
        $request['status'] = 1;
        $title = 'Item Checkout';
        $request['mode'] = 'online';
        $description = 'Item Checkout description';
        Session::put('user_paymentFor', 'user_item_order');

        if ($request->payment_method == "Paypal") {
            if (empty($bs->base_currency_rate)) {
                return redirect()->back()->with('error', __('Base currency rate not found'))->withInput($request->all());
            }
            $amount = round(($total / $bs->base_currency_rate), 2);
            $paypal = new PaypalController();
            $cancel_url = route('customer.itemcheckout.paypal.cancel', getParam());
            $success_url = route('customer.itemcheckout.paypal.success', getParam());
            return $paypal->paymentProcess($request, $amount, $title, $success_url, $cancel_url);
        } elseif ($request->payment_method == "Stripe") {
            $validated = $request->validate([
                'stripeToken' => 'required',
            ]);

            if (empty($bs->base_currency_rate)) {
                return redirect()->back()->with('error', __('Base currency rate not found'))->withInput($request->all());
            }
            $amount = round(($total / $bs->base_currency_rate), 2);
            $stripe = new StripeController();
            $cancel_url = route('customer.itemcheckout.stripe.cancel', getParam());
            
            return $stripe->paymentProcess($request, $amount, $title, NULL, $cancel_url);
        } elseif ($request->payment_method == "Paytm") {
            if ($bs->base_currency_text != "INR") {
                return redirect()->back()->with('error', __('only_paytm_INR'))->withInput($request->all());
            }
            $amount = $total;
            $item_number = uniqid('paytm-') . time();
            $callback_url = route('customer.itemcheckout.paytm.status', getParam());
            $paytm = new PaytmController();
            return $paytm->paymentProcess($request, $amount, $item_number, $callback_url);
        } elseif ($request->payment_method == "Paystack") {

            if ($bs->base_currency_text != "NGN") {
                return redirect()->back()->with('error', __('only_paystack_NGN'))->withInput($request->all());
            }
            $amount = $total * 100;
            $email = $request->billing_email;
            $success_url = route('customer.itemcheckout.paystack.success', getParam());
            $payStack = new PaystackController();
            return $payStack->paymentProcess($request, $amount, $email, $success_url, $bs);
        } elseif ($request->payment_method == "Razorpay") {
            if ($bs->base_currency_text != "INR") {
                return redirect()->back()->with('error', __('only_razorpay_INR'))->withInput($request->all());
            }
            $amount = $total;
            $item_number = uniqid('razorpay-') . time();
            $cancel_url = route('customer.itemcheckout.razorpay.cancel', getParam());
            $success_url = route('customer.itemcheckout.razorpay.success', getParam());
            $razorpay = new RazorpayController();
            return $razorpay->paymentProcess($request, $amount, $item_number, $cancel_url, $success_url, $title, $description, $bs);
        } elseif ($request->payment_method == "Instamojo") {
            if ($bs->base_currency_text != "INR") {
                return redirect()->back()->with('error', __('only_instamojo_INR'))->withInput($request->all());
            }
            if ($total < 9) {
                session()->flash('warning', 'Minimum 10 INR required for this payment gateway');
                return back()->withInput($request->all());
            }
            $amount = $total;
            $success_url = route('customer.itemcheckout.instamojo.success', getParam());
            $cancel_url = route('customer.itemcheckout.instamojo.cancel', getParam());
            $instaMojo = new InstamojoController();
            return $instaMojo->paymentProcess($request, $amount, $success_url, $cancel_url, $title, $bs);
        } elseif ($request->payment_method == "Mercadopago") {
            if ($bs->base_currency_text != "BRL") {
                return redirect()->back()->with('error', __('only_mercadopago_BRL'))->withInput($request->all());
            }

            $amount = $total;
            $email = $request->billing_email;
            $success_url = route('customer.itemcheckout.mercadopago.success', getParam());
            $cancel_url = route('customer.itemcheckout.mercadopago.cancel', getParam());
            $mercadopagoPayment = new MercadopagoController();
            return $mercadopagoPayment->paymentProcess($request, $amount, $success_url, $cancel_url, $email, $title, $description, $bs);
        } elseif ($request->payment_method == "Flutterwave") {
            $available_currency = array(
                'BIF', 'CAD', 'CDF', 'CVE', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'KES', 'LRD', 'MWK', 'NGN', 'RWF', 'SLL', 'STD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZMK', 'ZMW', 'ZWD'
            );
            if (!in_array($bs->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }
            $amount = $total;
            $email = $request->billing_email;
            $item_number = uniqid('flutterwave-') . time();
            $cancel_url = route('customer.itemcheckout.flutterwave.cancel', getParam());
            $success_url = route('customer.itemcheckout.flutterwave.success', getParam());
            $flutterWave = new FlutterWaveController();
            return $flutterWave->paymentProcess($request, $amount, $email, $item_number, $success_url, $cancel_url, $bs);
        } elseif ($request->payment_method == "Authorize.net") {

            $validated = $request->validate([
                'anetCardNumber' => 'required',
                'anetExpMonth' => 'required',
                'anetExpYear' => 'required',
                'anetCardCode' => 'required',
            ]);
            $available_currency = array('USD', 'CAD', 'CHF', 'DKK', 'EUR', 'GBP', 'NOK', 'PLN', 'SEK', 'AUD', 'NZD');
            if (!in_array($bs->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }
            $amount = $total;
            $cancel_url = route('customer.itemcheckout.anet.cancel', getParam());
            $anetPayment = new AuthorizenetController();
            return $anetPayment->paymentProcess($request, $amount, $cancel_url, $title, $bs);
        } elseif ($request->payment_method == "Mollie") {

            $available_currency = array('AED', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'ILS', 'ISK', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TWD', 'USD', 'ZAR');
            if (!in_array($bs->base_currency_text, $available_currency)) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }
            $amount = $total;
            $success_url = route('customer.itemcheckout.mollie.success', getParam());
            $cancel_url = route('customer.itemcheckout.mollie.cancel', getParam());
            $molliePayment = new MollieController();
            return $molliePayment->paymentProcess($request, $amount, $success_url, $cancel_url, $title, $bs);
        } elseif ($request->payment_method == "PhonePe") {

            if ($bs->base_currency_text != "INR") {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }
            $amount = $total;
            $success_url = route('customer.itemcheckout.phonepe.success', getParam());
            $cancel_url = route('customer.itemcheckout.phonepe.cancel', getParam());
            $phonePayment = new PhonePeController();
            return $phonePayment->paymentProcess($request, $amount, $title, $success_url, $cancel_url);
        } elseif ($request->payment_method == "Perfect Money") {
            if ($bs->base_currency_text != "USD") {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }
            $amount = $total;
            $success_url = route('customer.itemcheckout.perfect_money.success', getParam());
            $cancel_url = route('customer.itemcheckout.perfect_money.cancel', getParam());
            $perfectMoney = new PerfectMoneyController();
            return $perfectMoney->paymentProcess($request, $amount, $title, $success_url, $cancel_url);
        } elseif ($request->payment_method == "Xendit") {
            $allowed_currency = array('IDR', 'PHP', 'USD', 'SGD', 'MYR');
            if (!in_array($bs->base_currency_text, $allowed_currency)) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.xendit.success', getParam());
            $xendit = new XenditController();
            return $xendit->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "Yoco") {
            if ($bs->base_currency_text != 'ZAR') {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.yoco.success', getParam());
            $yoco = new YocoController();
            return $yoco->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "Toyyibpay") {
            if ($bs->base_currency_text != 'RM') {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.toyyibpay.success', getParam());
            $toyyibpay = new ToyyibpayController();
            return $toyyibpay->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "Paytabs") {
            $paytabInfo = paytabInfo('user', $user->id);
            if ($bs->base_currency_text != $paytabInfo['currency']) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.paytabs.success', getParam());
            $toyyibpay = new PaytabsController();
            return $toyyibpay->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "Midtrans") {
            if ($bs->base_currency_text != 'IDR') {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.midtrans.success', getParam());
            $toyyibpay = new MidtransController();
            return $toyyibpay->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "Iyzico") {
            if ($bs->base_currency_text != 'TRY') {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('customer.itemcheckout.iyzico.success', getParam());
            $iyzico = new IyzicoController();
            return $iyzico->paymentProcess($request, $amount, $title, $success_url);
        } elseif ($request->payment_method == "MyFatoorah") {
            $allowed_currency = array('KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD');
            if (!in_array($bs->base_currency_text, $allowed_currency)) {
                return redirect()->back()->with('error', __('invalid_currency'))->withInput($request->all());
            }

            $amount = $total;
            $success_url = route('myfatoorah.success');
            $iyzico = new ShopMyFatoorahController();
            return $iyzico->paymentProcess($request, $amount, $title, $success_url);
        } elseif (in_array($request->payment_method, $offline_payment_gateways)) {
            $request['mode'] = 'offline';
            $request['status'] = 0;
            $request['receipt_name'] = null;
            if ($request->has('receipt')) {
                $filename = time() . '.' . $request->file('receipt')->getClientOriginalExtension();
                $directory = public_path("assets/front/img/membership/receipt");
                if (!file_exists($directory)) mkdir($directory, 0775, true);
                @copy($request->file('receipt'), $directory . $filename);
                $request['receipt_name'] = $filename;
            }
            $amount = $total;
            $transaction_id = UserPermissionHelper::uniqidReal(8);
            $transaction_details = "offline";
            $chargeId = $request->paymentId;
            $order = $this->saveOrder($request, $transaction_id, $chargeId, 'Pending');
            $order_id = $order->id;
            $this->saveOrderedItems($order_id);
            $this->sendMails($order);
            session()->flash('success', __('successful_payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            return redirect()->route('customer.itemcheckout.offline.success', getParam());
        }
    }
    public function offlineSuccess()
    {
        return view('user-front.offline-success');
    }
}
