<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Basel\MyFatoorah\MyFatoorah;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use Illuminate\Support\Facades\Auth;

class MyFatoorahController extends Controller
{
    public $myfatoorah;

    public function __construct()
    {
        if (Session::has('user_midtrans')) {
            $user = Session::get('user_midtrans');
        } else {
            $user = getUser();
        }
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'myfatoorah']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        Config::set('myfatorah.token', $paydata['token']);
        Config::set('myfatorah.DisplayCurrencyIso', $currencyInfo->base_currency_text);
        Config::set('myfatorah.CallBackUrl', route('myfatoorah.success'));
        Config::set('myfatorah.ErrorUrl', route('myfatoorah.cancel'));
        if ($paydata['sandbox_status'] == 1) {
            $this->myfatoorah = MyFatoorah::getInstance(true);
        } else {
            $this->myfatoorah = MyFatoorah::getInstance(false);
        }
    }

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        Session::put('user_midtrans', $user);
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $customerInfo = Auth::guard('customer')->user();
        $allowed_currency = array('KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD');
        if (!in_array($currencyInfo->base_currency_text, $allowed_currency)) {
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
            'paymentMethod' => 'MyFatoorah',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/


        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        $success_url = route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);

        Session::put('myfatoorah_cancel_url', $cancelURL);
        Session::put('myfatoorah_success_url', $success_url);

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'myfatoorah']])->first();
        $paydata = $paymentMethod->convertAutoData();
        $random_1 = rand(999, 9999);
        $random_2 = rand(9999, 99999);

        // send request to myfatoorah for create a payment
        $result = $this->myfatoorah->sendPayment(
            $customerInfo->username,
            $calculatedData['grandTotal'],
            [
                'CustomerMobile' => $paydata['sandbox_status'] == 1 ? '56562123544' : $customerInfo->billing_number,
                'CustomerReference' => "$random_1",  //orderID
                'UserDefinedField' => "$random_2", //clientID
                "InvoiceItems" => [
                    [
                        "ItemName" => "Product Purchase or Room Booking",
                        "Quantity" => 1,
                        "UnitPrice" => $calculatedData['grandTotal']
                    ]
                ]
            ]
        );
        if ($result && $result['IsSuccess'] == true) {
            // put data into session for future use
            $request->session()->put('myfatoorah_payment_type', 'course');
            $request->session()->put('courseId', $courseId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            //return to payment url
            return redirect($result['Data']['InvoiceURL']);
        } else {
            // if fail then return to cancel url
            return redirect($cancelURL);
        }
    }

    // return to success page
    public function successPayment(Request $request)
    {
        // get the information from session
        $courseId = $request->session()->get('courseId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        if (!empty($request->paymentId)) {
            $result = $this->myfatoorah->getPaymentStatus('paymentId', $request->paymentId);
            if ($result && $result['IsSuccess'] == true && $result['Data']['InvoiceStatus'] == "Paid") {
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

                // if success all process then return for success url 
                return [
                    'status' => 'success'
                ];
            } else {
                // if fail then return for cancel url 
                return [
                    'status' => 'fail'
                ];
            }
        }
    }
}
