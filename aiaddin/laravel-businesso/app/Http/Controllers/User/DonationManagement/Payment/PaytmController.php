<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use Anand\LaravelPaytmWallet\Facades\PaytmWallet;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class PaytmController extends Controller
{
    use MiscellaneousTrait;
    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'paytm')
            ->where('user_id', $user->id)
            ->first();
        $paytmData = json_decode($data->information, true);
        config([
            // in case you would like to overwrite values inside config/services.php
            'services.paytm-wallet.env' => $paytmData['environment'],
            'services.paytm-wallet.merchant_id' => $paytmData['secret'],
            'services.paytm-wallet.merchant_key' => $paytmData['merchant'],
            'services.paytm-wallet.merchant_website' => $paytmData['website'],
            'services.paytm-wallet.industry_type' => $paytmData['industry'],
            'services.paytm-wallet.channel' => 'WEB',
        ]);
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for paytm payment.')->withInput();
        }
        $email = empty($request["checkbox"]) ? $request["email"] : $request["paytm_email"];
        $phone = empty($request["checkbox"]) ? $request["phone"] : $request['paytm_phone'];
        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => $email,
            'phone' => $phone,
            'causeId' => $causeId,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Paytm',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('cause_donate.paytm.notify', getParam());

        $payment = PaytmWallet::with('receive');

        $payment->prepare([
            'order' => time(),
            'user' => uniqid(),
            'mobile_number' => $phone,
            'email' => $email,
            'amount' => $request->amount,
            'callback_url' => $notifyURL
        ]);
        // put some data in session before redirect to paytm url
        $request->session()->put('userId', $userId);
        $request->session()->put('causeId', $causeId);
        $request->session()->put('arrData', $arrData);

        return $payment->receive();
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $causeId = $request->session()->get('causeId');
        $arrData = $request->session()->get('arrData');

        $transaction = PaytmWallet::with('receive');

        // this response is needed to check the transaction status
        $response = $transaction->response();

        if ($transaction->isSuccessful()) {
            $cause = new DonationController();

            // store the course enrolment information in database
            $donationDetails = $cause->store($arrData, $userId);

            // generate an invoice in pdf format
            $invoice = $cause->generateInvoice($donationDetails, $userId);

            // then, update the invoice field info in database
            $donationDetails->update(['invoice' => $invoice]);
            if ($donationDetails->email) {
                // send a mail to the customer with the invoice
                $cause->sendMail($donationDetails, $userId);
            }
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('causeId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('causeId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
