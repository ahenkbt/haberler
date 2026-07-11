<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class MercadoPagoController extends Controller
{
    use MiscellaneousTrait;
    private $token, $sandbox_status;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'mercadopago')
            ->where('user_id', $user->id)
            ->first();
        $mercadopagoData = json_decode($data->information, true);

        $this->token = $mercadopagoData['token'];
        $this->sandbox_status = $mercadopagoData['sandbox_check'];
    }

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $allowedCurrencies = array('ARS', 'BOB', 'BRL', 'CLF', 'CLP', 'COP', 'CRC', 'CUC', 'CUP', 'DOP', 'EUR', 'GTQ', 'HNL', 'MXN', 'NIO', 'PAB', 'PEN', 'PYG', 'USD', 'UYU', 'VEF', 'VES');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not
        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', 'Invalid currency for mercadopago payment.');
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
            'paymentMethod' => 'MercadoPago',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Course Enrolment';
        $notifyURL = route('course_enrolment.mercadopago.notify', getParam());
        $completeURL = route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
        $cancelURL = route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);

        $curl = curl_init();

        $preferenceData = [
            'items' => [
                [
                    'id' => uniqid(),
                    'title' => $title,
                    'description' => 'Course Enrolment via MercadoPago',
                    'quantity' => 1,
                    'currency' => $currencyInfo->base_currency_text,
                    'unit_price' => $calculatedData['grandTotal']
                ]
            ],
            'payer' => [
                'email' => Auth::guard('customer')->user()->email
            ],
            'back_urls' => [
                'success' => $notifyURL,
                'pending' => '',
                'failure' => $cancelURL
            ],
            'notification_url' => $notifyURL,
            'auto_return' => 'approved'
        ];

        $httpHeader = ['Content-Type: application/json'];

        $url = 'https://api.mercadopago.com/checkout/preferences?access_token=' . $this->token;

        $curlOPT = [
            CURLOPT_URL             => $url,
            CURLOPT_CUSTOMREQUEST   => 'POST',
            CURLOPT_POSTFIELDS      => json_encode($preferenceData, true),
            CURLOPT_HTTP_VERSION    => CURL_HTTP_VERSION_1_1,
            CURLOPT_RETURNTRANSFER  => true,
            CURLOPT_TIMEOUT         => 30,
            CURLOPT_HTTPHEADER      => $httpHeader
        ];

        curl_setopt_array($curl, $curlOPT);

        $response = curl_exec($curl);
        $responseInfo = json_decode($response, true);

        curl_close($curl);

        // put some data in session before redirect to mercadopago url
        $request->session()->put('userId', $userId);
        $request->session()->put('courseId', $courseId);
        $request->session()->put('arrData', $arrData);

        if ($this->sandbox_status == 1) {
            return redirect($responseInfo['sandbox_init_point']);
        } else {
            return redirect($responseInfo['init_point']);
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $courseId = $request->session()->get('courseId');
        $arrData = $request->session()->get('arrData');
        $paymentURL = 'https://api.mercadopago.com/v1/payments/' . $request['payment_id'] . '?access_token=' . $this->token;

        $paymentData = $this->curlCalls($paymentURL);
        $paymentInfo = json_decode($paymentData, true);

        if ($paymentInfo['status'] == 'approved') {
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

    public function curlCalls($url)
    {
        $curl = curl_init();

        curl_setopt($curl, CURLOPT_URL, $url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

        $curlData = curl_exec($curl);

        curl_close($curl);

        return $curlData;
    }
}
