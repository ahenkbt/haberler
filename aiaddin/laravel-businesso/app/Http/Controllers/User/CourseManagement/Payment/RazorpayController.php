<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
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

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the currency is set to 'INR' or not
        if ($currencyInfo->base_currency_text !== 'INR') {
            return redirect()->back()->with('error', 'Invalid currency for razorpay payment.')->withInput();
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
            'paymentMethod' => 'Razorpay',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('course_enrolment.razorpay.notify', getParam());

        // create order data
        $orderData = [
            'receipt'         => 'Course Enrolment',
            'amount'          => $calculatedData['grandTotal'] * 100,
            'currency'        => 'INR',
            'payment_capture' => 1 // auto capture
        ];

        $razorpayOrder = $this->api->order->create($orderData);

        $webInfo = DB::table('basic_settings')->select('website_title')->first();
        $buyerName = Auth::guard('customer')->user()->first_name . ' ' . Auth::guard('customer')->user()->last_name;
        $buyerEmail = Auth::guard('customer')->user()->email;
        $buyerContact = Auth::guard('customer')->user()->contact_number;

        // create checkout data
        $checkoutData = [
            'key'               => $this->key,
            'amount'            => $orderData['amount'],
            'name'              => $webInfo->website_title,
            'description'       => 'Course Enrolment Via Razorpay',
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
        $request->session()->put('courseId', $courseId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('razorpayOrderId', $razorpayOrder->id);

        return view('user-front.course_management.payment.razorpay', [getParam(), 'jsonData' => $jsonData, 'notifyURL' => $notifyURL]);
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $courseId = $request->session()->get('courseId');
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
            $request->session()->forget('razorpayOrderId');

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('razorpayOrderId');

            return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
        }
    }
}
