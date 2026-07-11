<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Mollie\Api\MollieApiClient;

class MollieController extends Controller
{
    use MiscellaneousTrait;
    protected $mollie, $key;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'mollie')
            ->where('user_id', $user->id)
            ->first();

        $mollieData = json_decode($data->information, true);
        $this->key = $mollieData['key'];

        $this->mollie = new MollieApiClient();
        $this->mollie->setApiKey($this->key);
    }

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $allowedCurrencies = array('AED', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'ILS', 'ISK', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TWD', 'USD', 'ZAR');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not
        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', 'Invalid currency for mollie payment.')->withInput();
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
            'paymentMethod' => 'Mollie',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('course_enrolment.mollie.notify', getParam());

        /**
         * we must send the correct number of decimals.
         * thus, we have used sprintf() function for format.
         */

        $payment = $this->mollie->payments->create([
            'amount' => [
                'currency' => $currencyInfo->base_currency_text,
                'value' => sprintf('%0.2f', $calculatedData['grandTotal'])
            ],
            'description' => 'Course Enrolment Via Mollie',
            'redirectUrl' => $notifyURL
        ]);

        // put some data in session before redirect to mollie url
        $request->session()->put('userId', $userId);
        $request->session()->put('courseId', $courseId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('paymentId', $payment->id);

        return redirect($payment->getCheckoutUrl(), 303);
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $courseId = $request->session()->get('courseId');
        $arrData = $request->session()->get('arrData');
        $paymentId = $request->session()->get('paymentId');

        $paymentInfo = $this->mollie->payments->get($paymentId);

        if ($paymentInfo->isPaid() == true) {
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
