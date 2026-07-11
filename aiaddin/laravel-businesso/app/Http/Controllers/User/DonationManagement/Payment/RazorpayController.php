<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\BasicSetting;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Razorpay\Api\Api;
use Razorpay\Api\Errors\SignatureVerificationError;

class RazorpayController extends Controller
{
    use MiscellaneousTrait;
    private $key, $secret, $api;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'razorpay')
            ->where('user_id', $user->id)
            ->first();
        $razorpayData = json_decode($data->information, true);

        $this->key = $razorpayData['key'];
        $this->secret = $razorpayData['secret'];

        $this->api = new Api($this->key, $this->secret);
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for razorpay payment.')->withInput();
        }
        $name = empty($request["checkbox"]) ? $request["name"] : "anonymous";
        $phone = empty($request["checkbox"]) ? $request["phone"] : $request['razorpay_phone'];
        $email =  empty($request["checkbox"]) ? $request["email"] : $request['razorpay_email'];
        $arrData = array(
            'name' => $name,
            'email' => $email,
            'phone' => $phone,
            'causeId' => $causeId,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Razorpay',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('cause_donate.razorpay.notify', getParam());

        // create order data
        $orderData = [
            'receipt'         => 'Given Donation',
            'amount'          => $request->amount * 100,
            'currency'        => 'INR',
            'payment_capture' => 1 // auto capture
        ];

        $razorpayOrder = $this->api->order->create($orderData);

        $webInfo = BasicSetting::where('user_id', $userId)->select('website_title')->first();
        $buyerName = $name;
        $buyerEmail = $email;
        $buyerContact = $phone;

        // create checkout data
        $checkoutData = [
            'key'               => $this->key,
            'amount'            => $request->amount,
            'name'              => $webInfo->website_title,
            'description'       => 'Donate Via Razorpay',
            'prefill'           => [
                'name'              => $buyerName,
                'email'             => $buyerEmail,
                'contact'           => $buyerContact
            ],
            'order_id'          => $razorpayOrder->id
        ];

        $jsonData = json_encode($checkoutData);

        // put some data in session before redirect to razorpay url
        $request->session()->put('userId', $userId);
        $request->session()->put('causeId', $causeId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('razorpayOrderId', $razorpayOrder->id);

        return view('user-front.donation_management.payment.razorpay', [getParam(), 'jsonData' => $jsonData, 'notifyURL' => $notifyURL]);
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $causeId = $request->session()->get('causeId');
        $arrData = $request->session()->get('arrData');
        $razorpayOrderId = $request->session()->get('razorpayOrderId');

        $urlInfo = $request->all();

        // assume that the transaction was successful
        $success = true;

        /**
         * either razorpay_order_id or razorpay_subscription_id must be present.
         * the keys of $attributes array must be followed razorpay convention.
         */
        try {
            $attributes = [
                'razorpay_order_id' => $razorpayOrderId,
                'razorpay_payment_id' => $urlInfo['razorpayPaymentId'],
                'razorpay_signature' => $urlInfo['razorpaySignature']
            ];

            $this->api->utility->verifyPaymentSignature($attributes);
        } catch (SignatureVerificationError $e) {
            $success = false;
        }

        if ($success === true) {
            $cause = new DonationController();

            // store the course enrolment information in database
            $donationDetails = $cause->store($arrData, $userId);

            // generate an invoice in pdf format
            $invoice = $cause->generateInvoice($donationDetails,  $userId);

            // then, update the invoice field info in database
            $donationDetails->update(['invoice' => $invoice]);
            if ($donationDetails->email) {
                // send a mail to the customer with the invoice
                $cause->sendMail($donationDetails, $userId);
            }
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('razorpayOrderId');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('razorpayOrderId');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
