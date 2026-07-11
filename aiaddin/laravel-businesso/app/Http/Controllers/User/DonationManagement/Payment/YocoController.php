<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;

class YocoController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        $enrol = new DonationController();
        $keywords = getUserKeywords();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not 
        if ($currencyInfo->base_currency_text != 'ZAR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for yoco payment.');
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
            'paymentMethod' => 'Yoco',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $user = getUser();
        $notifyURL = route('cause_donation.yoco.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $response = Http::withHeaders([
            'Content-Type' => 'application/json',
            'Authorization' => 'Bearer ' . $paydata['secret_key'],
        ])->post('https://payments.yoco.com/api/checkouts', [
            'amount' => $amount * 100,
            'currency' => 'ZAR',
            'successUrl' => $notifyURL
        ]);

        $responseData = $response->json();
        if (array_key_exists('redirectUrl', $responseData)) {
            // put some data in session before redirect to yoco url 
            $request->session()->put('causeId', $causeId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            $request->session()->put('yoco_id', $responseData['id']);
            $request->session()->put('s_key', $paydata['secret_key']);
            return redirect($responseData["redirectUrl"]);
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

        $id = Session::get('yoco_id');
        $s_key = Session::get('s_key');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'yoco']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        if ($id && $paydata['secret_key'] == $s_key) {
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
            $request->session()->forget('yoco_id');
            $request->session()->forget('s_key');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('cause');
            $request->session()->forget('arrData');
            $request->session()->forget('yoco_id');
            $request->session()->forget('s_key');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
