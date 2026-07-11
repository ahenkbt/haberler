<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Omnipay\Omnipay;

class AuthorizenetController extends Controller
{
    use MiscellaneousTrait;
    public $gateway;

    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'authorize.net')
            ->where('user_id', $user->id)
            ->first();
        $paydata = $data->convertAutoData();
        $this->gateway = Omnipay::create('AuthorizeNetApi_Api');
        $this->gateway->setAuthName($paydata['login_id']);
        $this->gateway->setTransactionKey($paydata['transaction_key']);
        if ($paydata['sandbox_check'] == 1) {
            $this->gateway->setTestMode(true);
        }
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {


        $allowedCurrencies = array('BIF', 'CAD', 'CDF', 'CVE', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'KES', 'LRD', 'MWK', 'MZN', 'NGN', 'RWF', 'SLL', 'STD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZMK', 'ZMW', 'ZWD');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for Authorize Net payment.')->withInput();
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
            'paymentMethod' => 'Authorize.net',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $amount = (int) $request->amount;
        if ($request->input('opaqueDataDescriptor') && $request->input('opaqueDataValue')) {
            try {
                // Generate a unique merchant site transaction ID.
                $transactionId = rand(100000000, 999999999);
                $response = $this->gateway->authorize([
                    'amount' => $amount,
                    'currency' => $currencyInfo->base_currency_text,
                    'transactionId' => $transactionId,
                    'opaqueDataDescriptor' => $request->input('opaqueDataDescriptor'),
                    'opaqueDataValue' => $request->input('opaqueDataValue'),
                ])->send();

                if ($response->isSuccessful()) {

                    // Captured from the authorization response.
                    $transactionReference = $response->getTransactionReference();

                    $response = $this->gateway->capture([
                        'amount' => $amount,
                        'currency' => $currencyInfo->base_currency_text,
                        'transactionReference' => $transactionReference,
                    ])->send();

                    $transaction_id = $response->getTransactionReference();
                    $cause  = new DonationController();
                    // store the course enrolment information in database
                    $donationDetails = $cause->store($arrData, $userId);

                    // generate an invoice in pdf format
                    $invoice = $cause->generateInvoice($donationDetails,  $userId);

                    // then, update the invoice field info in database
                    $donationDetails->update(['invoice' => $invoice]);
                    if ($donationDetails->email) {
                        // send a mail to the customer with the invoice
                        $cause->sendMail($donationDetails, $userId);
                    }
                    return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
                } else {
                    // not successful
                    session()->flash('error', $response->getMessage());
                    return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
                }
            } catch (\Exception $e) {
                session()->flash('error', $e->getMessage());
                return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
            }
        }
    }
}
