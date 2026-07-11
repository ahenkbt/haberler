<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Auth;
use App\Models\User\BasicSetting;
use Illuminate\Support\Facades\Session;

class PerfectMoneyController extends Controller
{
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $customerInfo = Auth::guard('customer')->user();
        if ($currencyInfo->base_currency_text !== 'USD') {
            return redirect()->back()->with('error', 'Invalid currency for perfect money payment.')->withInput();
        }

        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            // 'coursePrice' => 0.01, //test price
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Perfect Money',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Course Enrolment';
        $notifyURL = route('course_enrolment.perfect_money.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);

        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'perfect_money']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        /*---------------------------------------
        ========= Payment gatewyay ===============
        ----------------------------------------*/
        $user = getUser();
        $userBs = BasicSetting::select('website_title')->where('user_id', $user->id)->first();
        $randomNo = substr(uniqid(), 0, 8);

        $val['PAYEE_ACCOUNT'] = $paydata['perfect_money_wallet_id'];;
        $val['PAYEE_NAME'] = $userBs->website_title;
        $val['PAYMENT_ID'] = "$randomNo"; //random id
        $val['PAYMENT_AMOUNT'] = $calculatedData['coursePrice'];
        // $val['PAYMENT_AMOUNT'] = 0.01; //test amount
        $val['PAYMENT_UNITS'] = "$currencyInfo->base_currency_text";

        $val['STATUS_URL'] = $notifyURL;
        $val['PAYMENT_URL'] = $notifyURL;
        $val['PAYMENT_URL_METHOD'] = 'GET';
        $val['NOPAYMENT_URL'] = $cancelURL;
        $val['NOPAYMENT_URL_METHOD'] = 'GET';
        $val['SUGGESTED_MEMO'] = "$customerInfo->email";
        $val['BAGGAGE_FIELDS'] = 'IDENT';

        $data['val'] = $val;
        $data['method'] = 'post';
        $data['url'] = 'https://perfectmoney.com/api/step1.asp';

        // put some data in session before redirect to paypal url
        Session::put('payment_id', $randomNo);
        Session::put('cancel_url', $cancelURL);
        Session::put('amount', $calculatedData['coursePrice']);
        // Session::put('amount', 0.01); //test amount

        Session::put('courseId', $courseId);
        Session::put('userId', $userId);
        Session::put('arrData', $arrData);

        return view('payments.perfect-money', compact('data'));
    }

    public function notify(Request $request)
    {
        // get the information from session
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');
        $amo = $request['PAYMENT_AMOUNT'];
        $track = $request['PAYMENT_ID'];
        $id = Session::get('payment_id');
        $final_amount = Session::get('amount');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'perfect_money']])->first();
        $perfectMoneyInfo = $paymentMethod->convertAutoData();

        if ($request->PAYEE_ACCOUNT == $perfectMoneyInfo['perfect_money_wallet_id']  && $track == $id && $amo == round($final_amount, 2)) {
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
            Session::forget('userId');
            Session::forget('courseId');
            Session::forget('arrData');
            Session::forget('payment_id');
            Session::forget('cancel_url');
            Session::forget('amount');

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        } else {
            // remove all session data
            Session::forget('userId');
            Session::forget('courseId');
            Session::forget('arrData');
            Session::forget('payment_id');
            Session::forget('cancel_url');
            Session::forget('amount');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
