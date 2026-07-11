<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Basel\MyFatoorah\MyFatoorah;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\DonationManagement\DonationController;

class MyFatoorahController extends Controller
{
    public $myfatoorah;
    use MiscellaneousTrait;

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

    public function donationProcess(Request $request, $causeId, $userId)
    {
        $enrol = new DonationController();
        $keywords = getUserKeywords();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not 
        $allowed_currency = array('KWD', 'SAR', 'BHD', 'AED', 'QAR', 'OMR', 'JOD');
        if (!in_array($currencyInfo->base_currency_text, $allowed_currency)) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for myfatoorah payment.');
        }

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'MyFatoorah',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $user = getUser();
        Session::put('user_midtrans', $user);
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        $success_url = route('front.user.cause_donate.complete', [getParam(), 'donation']);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        Session::put('myfatoorah_cancel_url', $cancelURL);
        Session::put('myfatoorah_success_url', $success_url);

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'myfatoorah']])->first();
        $paydata = $paymentMethod->convertAutoData();
        $random_1 = rand(999, 9999);
        $random_2 = rand(9999, 99999);
        if (empty($request["checkbox"])) {
            $name = $request->name;
            $phone = $request->phone;
        } else {
            $name = 'anonymous@gmail.com';
            $phone = '1234567890';
        }

        // create a payment request
        $result = $this->myfatoorah->sendPayment(
            $name,
            $amount,
            [
                'CustomerMobile' => $paydata['sandbox_status'] == 1 ? '56562123544' : $phone,
                'CustomerReference' => "$random_1",  //orderID
                'UserDefinedField' => "$random_2", //clientID
                "InvoiceItems" => [
                    [
                        "ItemName" => "Product Purchase or Room Booking",
                        "Quantity" => 1,
                        "UnitPrice" => $amount
                    ]
                ]
            ]
        );
        if ($result && $result['IsSuccess'] == true) {
            // put data in session for future use
            $request->session()->put('myfatoorah_payment_type', 'donation');
            $request->session()->put('causeId', $causeId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);
            // redirect to payment url for accept payment
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
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        if (!empty($request->paymentId)) {
            $result = $this->myfatoorah->getPaymentStatus('paymentId', $request->paymentId);
            if ($result && $result['IsSuccess'] == true && $result['Data']['InvoiceStatus'] == "Paid") {
                $donate = new DonationController();

                // store the course enrolment information in database
                $donationDetails = $donate->store($arrData, $userId);
                // generate an invoice in pdf format
                $invoice = $donate->generateInvoice($donationDetails, $userId);

                // then, update the invoice field info in database
                $donationDetails->update(['invoice' => $invoice]);
                if ($donationDetails->email) {
                    // send a mail to the customer with the invoice
                    $donate->sendMail($donationDetails, $userId);
                }

                // remove all session data
                $request->session()->forget('userId');
                $request->session()->forget('cause');
                $request->session()->forget('arrData');
                // if successfully completed all process then return for success url
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
