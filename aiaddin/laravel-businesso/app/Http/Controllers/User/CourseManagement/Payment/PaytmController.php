<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use Anand\LaravelPaytmWallet\Facades\PaytmWallet;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
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

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', 'Invalid currency for paytm payment.')->withInput();
        }

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Paytm',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('course_enrolment.paytm.notify', getParam());

        $payment = PaytmWallet::with('receive');

        $payment->prepare([
            'order' => time(),
            'user' => uniqid(),
            'mobile_number' => Auth::guard('customer')->user()->phone,
            'email' => Auth::guard('customer')->user()->email,
            'amount' => $calculatedData['grandTotal'],
            'callback_url' => $notifyURL
        ]);

        // put some data in session before redirect to paytm url
        $request->session()->put('userId', $userId);
        $request->session()->put('courseId', $courseId);
        $request->session()->put('arrData', $arrData);

        return $payment->receive();
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $courseId = $request->session()->get('courseId');
        $arrData = $request->session()->get('arrData');

        $transaction = PaytmWallet::with('receive');

        // this response is needed to check the transaction status
        $response = $transaction->response();

        if ($transaction->isSuccessful()) {
            $enrol = new EnrolmentController();

            // store the course enrolment information in database
            $enrolmentInfo = $enrol->storeData($arrData, $userId);

            // generate an invoice in pdf format
            $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

            // then, update the invoice field info in database
            $enrolmentInfo->update(['invoice' => $invoice]);

            // send a mail to the customer with the invoice
            $enrol->sendMail($enrolmentInfo, $userId);

            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
