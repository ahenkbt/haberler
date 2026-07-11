<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
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

    public function donationProcess(Request $request, $causeId, $userId)
    {
        $keywords = getUserKeywords();

        $allowedCurrencies = array('AED', 'AUD', 'BGN', 'BRL', 'CAD', 'CHF', 'CZK', 'DKK', 'EUR', 'GBP', 'HKD', 'HRK', 'HUF', 'ILS', 'ISK', 'JPY', 'MXN', 'MYR', 'NOK', 'NZD', 'PHP', 'PLN', 'RON', 'RUB', 'SEK', 'SGD', 'THB', 'TWD', 'USD', 'ZAR');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not
        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for mollie payment.')->withInput();
        }

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Mollie',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $notifyURL = route('cause_donate.mollie.notify', getParam());

        /**
         * we must send the correct number of decimals.
         * thus, we have used sprintf() function for format.
         */

        $payment = $this->mollie->payments->create([
            'amount' => [
                'currency' => $currencyInfo->base_currency_text,
                'value' => sprintf('%0.2f', $request->amount)
            ],
            'description' => 'Donate Via Mollie',
            'redirectUrl' => $notifyURL
        ]);

        // put some data in session before redirect to mollie url
        $request->session()->put('userId', $userId);
        $request->session()->put('causeId', $causeId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('paymentId', $payment->id);

        return redirect($payment->getCheckoutUrl(), 303);
    }

    public function notify(Request $request)
    {
        // get the information from session
        $userId = $request->session()->get('userId');
        $causeId = $request->session()->get('causeId');
        $arrData = $request->session()->get('arrData');
        $paymentId = $request->session()->get('paymentId');

        $paymentInfo = $this->mollie->payments->get($paymentId);

        if ($paymentInfo->isPaid() == true) {
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
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('paymentId');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
