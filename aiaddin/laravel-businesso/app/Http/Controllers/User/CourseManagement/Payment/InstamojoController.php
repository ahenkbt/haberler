<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Helpers\Instamojo;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class InstamojoController extends Controller
{
    use MiscellaneousTrait;
    private $api;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'instamojo')
            ->where('user_id', $user->id)
            ->first();
        $instamojoData = json_decode($data->information, true);

        if ($instamojoData['sandbox_check'] == 1) {
            $this->api = new Instamojo($instamojoData['key'], $instamojoData['token'], 'https://test.instamojo.com/api/1.1/');
        } else {
            $this->api = new Instamojo($instamojoData['key'], $instamojoData['token']);
        }
    }

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', 'Invalid currency for instamojo payment.')->withInput();
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
            'paymentMethod' => 'Instamojo',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Course Enrolment';
        $notifyURL = route('course_enrolment.instamojo.notify', getParam());

        try {
            $response = $this->api->paymentRequestCreate(array(
                'purpose' => $title,
                'amount' => $calculatedData['grandTotal'],
                'buyer_name' => Auth::guard('customer')->user()->first_name . ' ' . Auth::guard('customer')->user()->last_name,
                'send_email' => true,
                'email' => Auth::guard('customer')->user()->email,
                'phone' => Auth::guard('customer')->user()->contact_number,
                'redirect_url' => $notifyURL
            ));
            // put some data in session before redirect to instamojo url
            $request->session()->put('userId', $userId);
            $request->session()->put('courseId', $courseId);
            $request->session()->put('arrData', $arrData);
            $request->session()->put('paymentId', $response['id']);

            return redirect($response['longurl']);
        } catch (Exception $e) {
            return redirect()->back()->with('error', $e)->withInput();
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $courseId = $request->session()->get('courseId');
        $arrData = $request->session()->get('arrData');
        $paymentId = $request->session()->get('paymentId');

        $urlInfo = $request->all();

        if ($urlInfo['payment_request_id'] == $paymentId) {
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
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
