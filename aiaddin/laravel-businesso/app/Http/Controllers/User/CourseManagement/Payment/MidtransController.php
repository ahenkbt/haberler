<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;

use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Midtrans\Snap;
use Midtrans\Config as MidtransConfig;

class MidtransController extends Controller
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
        $notifyURL = route('course_enrolment.midtrans.notify', getParam());
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        if ($currencyInfo->base_currency_text != 'IDR') {
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
            'paymentMethod' => 'Midtrans',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'midtrans']])->first();
        $paydata = $paymentMethod->convertAutoData();
        // will come from database
        MidtransConfig::$serverKey = $paydata['server_key'];
        MidtransConfig::$isProduction = $paydata['is_production'] == 0 ? true : false;
        MidtransConfig::$isSanitized = true;
        MidtransConfig::$is3ds = true;
        $token = uniqid();
        Session::put('token', $token);
        $params = [
            'transaction_details' => [
                'order_id' => $token,
                'gross_amount' => $calculatedData['grandTotal'] * 1000, // will be multiplied by 1000
            ],
            'customer_details' => [
                'first_name' => $customerInfo->username,
                'email' => $customerInfo->billing_email,
                'phone' => $customerInfo->contact_number ? $customerInfo->contact_number : null,
            ],
        ];

        $snapToken = Snap::getSnapToken($params);

        // put some data in session before redirect to midtrans url
        if (
            $paydata['is_production'] == 1
        ) {
            $is_production = $paydata['is_production'];
        }
        $data['title'] = "Course Enrolment via midtrans";
        $data['snapToken'] = $snapToken;
        $data['is_production'] = $is_production;
        $data['success_url'] = $notifyURL;
        $data['_cancel_url'] = $cancelURL;
        $data['client_key'] = $paydata['server_key'];
        // put some data in session before redirect to xendit url
        $request->session()->put('courseId', $courseId);
        $request->session()->put('userId', $userId);
        $request->session()->put('arrData', $arrData);
        //put data into session for midtrans bank notify
        Session::put('user_midtrans', $user);
        Session::put('midtrans_payment_type', 'course');
        Session::put('midtrans_cancel_url', route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]));
        Session::put('midtrans_success_url', route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]));

        return view('payments.midtrans-membership', $data);
    }

    // return to success page
    public function notify(Request $request)
    {
        // get the information from session
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $token = Session::get('token');
        if ($request->status_code == 200 && $token == $request->order_id) {
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
