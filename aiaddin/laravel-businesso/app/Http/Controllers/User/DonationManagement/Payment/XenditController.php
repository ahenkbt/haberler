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

class XenditController extends Controller
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
        $allowed_currency = array('IDR', 'PHP', 'USD', 'SGD', 'MYR');
        if (!in_array($currencyInfo->base_currency_text, $allowed_currency)) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for xendit payment.');
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
            'paymentMethod' => 'Xendit',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $notifyURL = route('cause_donation.xendit.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'xendit']])->first();
        $paydata = json_decode($paymentMethod->information, true);
        $external_id = Str::random(10);
        $secret_key = 'Basic ' . base64_encode($paydata['secret_key'] . ':');
        $data_request = Http::withHeaders([
            'Authorization' => $secret_key
        ])->post('https://api.xendit.co/v2/invoices', [
            'external_id' => $external_id,
            'amount' => $amount,
            'currency' => $currencyInfo->base_currency_text,
            'success_redirect_url' => $notifyURL
        ]);
        $response = $data_request->object();
        $response = json_decode(json_encode($response), true);
        if (!empty($response['success_redirect_url'])) {
            // put some data in session before redirect to xendit url 
            $request->session()->put('causeId', $causeId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            $request->session()->put('xendit_id', $response['id']);
            $request->session()->put('secret_key', $secret_key);


            return redirect($response['invoice_url']);
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

        $xendit_id = Session::get('xendit_id');
        $secret_key = Session::get('secret_key');
        $paymentMethod = UserPaymentGeteway::where([['user_id', $userId], ['keyword', 'xendit']])->first();
        $paydata = json_decode($paymentMethod->information, true);

        $p_secret_key = 'Basic ' . base64_encode($paydata['secret_key'] . ':');
        if (!is_null($xendit_id) && $secret_key == $p_secret_key) {
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
            $request->session()->forget('xendit_id');
            $request->session()->forget('secret_key');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('courseId');
            $request->session()->forget('arrData');
            $request->session()->forget('xendit_id');
            $request->session()->forget('secret_key');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
