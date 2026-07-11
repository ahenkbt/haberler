<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;

class ToyyibpayController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $enrol = new DonationController();
        $keywords = getUserKeywords();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not 
        if ($currencyInfo->base_currency_text != 'RM') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for toyyibpay payment.');
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
            'paymentMethod' => 'Toyyibpay',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $user = getUser();
        $notifyURL = route('cause_donation.toyyibpay.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [
            getParam(), 'id' => $causeId
        ]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $user = getUser();
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'toyyibpay']])->first();
        $paydata = json_decode(
            $paymentMethod->information,
            true
        );
        $ref = uniqid();
        session()->put('toyyibpay_ref_id', $ref);


        $some_data = array(
            'userSecretKey' => $paydata['secret_key'],
            'categoryCode' => $paydata['category_code'],
            'billName' => 'Course Enrolment',
            'billDescription' => 'Pay via Course Enrolment',
            'billPriceSetting' => 1,
            'billPayorInfo' => 1,
            'billAmount' => $request->amount * 100,
            'billReturnUrl' => $notifyURL,
            'billExternalReferenceNo' => $ref,
            'billTo' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'billEmail' => empty($request["checkbox"]) ? $request["email"] : "anoymous@gmail.com",
            'billPhone' => empty($request["checkbox"]) ? $request["phone"] : "04982409238",
        );

        if ($paydata['sandbox_status'] == 1) {
            $host = 'https://dev.toyyibpay.com/'; // for development environment
        } else {
            $host = 'https://toyyibpay.com/'; // for production environment
        }

        $curl = curl_init();
        curl_setopt($curl, CURLOPT_POST, 1);
        curl_setopt($curl, CURLOPT_URL, $host . 'index.php/api/createBill');  // sandbox will be dev.
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($curl, CURLOPT_POSTFIELDS, $some_data);

        $result = curl_exec($curl);
        $info = curl_getinfo($curl);
        curl_close($curl);
        $response = json_decode($result, true);
        if (!empty($response[0])) {
            // put some data in session before redirect to xendit url
            $request->session()->put('causeId', $causeId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);
            return redirect($host . $response[0]["BillCode"]);
        } else {
            return redirect($cancelURL);
        }
    }

    // return to success page
    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $ref = session()->get('toyyibpay_ref_id');
        if ($request['status_id'] == 1 && $request['order_id'] == $ref) {
            $donate = new DonationController();

            // store the course enrolment information in database
            $donationDetails = $donate->store($arrData, $userId);
            // generate an invoice in pdf format
            $invoice = $donate->generateInvoice($donationDetails, $userId);

            // then, update the invoice field info in database
            $donationDetails->update(['invoice' => $invoice]);
            if ($donationDetails->email) {
                // dd($donationDetails);
                // send a mail to the customer with the invoice
                $donate->sendMail($donationDetails, $userId);
            }

            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('cause');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data 
            $request->session()->forget('userId');
            $request->session()->forget('cause');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
