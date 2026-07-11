<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;

class YocoController extends Controller
{
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $customerInfo = Auth::guard('customer')->user();
        $notifyURL = route('course_enrolment.yoco.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        if ($currencyInfo->base_currency_text != 'ZAR') {
            return redirect()->back()->with('error', 'Invalid currency for yoco payment.')->withInput();
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
            'paymentMethod' => 'Yoco',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $paydata['secret_key'],
        ])->post('https://payments.yoco.com/api/checkouts', [
            'amount' => $calculatedData['grandTotal'] * 100,
            'currency' => 'ZAR',
            'successUrl' => $notifyURL
        ]);

        $responseData = $response->json();
        if (array_key_exists('redirectUrl', $responseData)) {
            // put some data in session before redirect to xendit url
            $request->session()->put('courseId', $courseId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            $request->session()->put('yoco_id', $responseData['id']);
            $request->session()->put('s_key', $paydata['secret_key']);
            return redirect($responseData["redirectUrl"]);
        } else {
            return redirect($cancelURL);
        }
    }

    // return to success page
    public function notify(Request $request)
    {
        // get the information from session
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $id = Session::get('yoco_id');
        $s_key = Session::get('s_key');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        if ($id && $paydata['secret_key'] == $s_key) {
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
