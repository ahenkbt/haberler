<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
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

    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        $enrol = new EnrolmentController();
        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $allowedCurrencies = array('BIF', 'CAD', 'CDF', 'CVE', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'KES', 'LRD', 'MWK', 'MZN', 'NGN', 'RWF', 'SLL', 'STD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZMK', 'ZMW', 'ZWD');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', 'Invalid currency for Authorize Net payment.')->withInput();
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
            'paymentMethod' => 'Authorize.net',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        if ($request->input('opaqueDataDescriptor') && $request->input('opaqueDataValue')) {
            try {
                // Generate a unique merchant site transaction ID.
                $transactionId = rand(100000000, 999999999);
                $response = $this->gateway->authorize([
                    'amount' => $calculatedData['grandTotal'],
                    'currency' => $currencyInfo->base_currency_text,
                    'transactionId' => $transactionId,
                    'opaqueDataDescriptor' => $request->input('opaqueDataDescriptor'),
                    'opaqueDataValue' => $request->input('opaqueDataValue'),
                ])->send();

                if ($response->isSuccessful()) {

                    // Captured from the authorization response.
                    $transactionReference = $response->getTransactionReference();

                    $response = $this->gateway->capture([
                        'amount' => $calculatedData['grandTotal'],
                        'currency' => $currencyInfo->base_currency_text,
                        'transactionReference' => $transactionReference,
                    ])->send();

                    $transaction_id = $response->getTransactionReference();

                    // store the course enrolment information in database
                    $enrolmentInfo = $enrol->storeData($arrData, $userId);

                    // generate an invoice in pdf format
                    $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

                    // then, update the invoice field info in database
                    $enrolmentInfo->update(['invoice' => $invoice]);

                    // send a mail to the customer with the invoice
                    $enrol->sendMail($enrolmentInfo, $userId);

                    return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId]);
                } else {
                    // not successful
                    session()->flash('error', $response->getMessage());
                    return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
                }
            } catch (\Exception $e) {
                session()->flash('error', $e->getMessage());
                return redirect()->route('front.user.course_enrolment.cancel', [getParam(), 'id' => $courseId]);
            }
        }
    }
}
