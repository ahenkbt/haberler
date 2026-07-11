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

class PaytabsController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        $enrol = new DonationController();
        $user = getUser();
        $keywords = getUserKeywords();

        // do calculation
        $amount = $request->amount;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not 
        $paytabInfo = paytabInfo('user', $user->id);
        if ($currencyInfo->base_currency_text != $paytabInfo['currency']) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for paytabs payment.');
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
            'paymentMethod' => 'Paytabs',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $user = getUser();
        $notifyURL = route('cause_donation.paytabs.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paytabInfo = paytabInfo('user', $user->id);
        $description = 'Course enrolment via paytabs';
        try {
            $response = Http::withHeaders([
                'Authorization' => $paytabInfo['server_key'], // Server Key
                'Content-Type' => 'application/json',
            ])->post(
                $paytabInfo['url'],
                [
                    'profile_id' => $paytabInfo['profile_id'], // Profile ID
                    'tran_type' => 'sale',
                    'tran_class' => 'ecom',
                    'cart_id' => uniqid(),
                    'cart_description' => $description,
                    'cart_currency' => $paytabInfo['currency'], // set currency by region
                    'cart_amount' => round($amount, 2),
                    'return' => $notifyURL,
                ]
            );

            $responseData = $response->json();
            // put some data in session before redirect to yoco url 
            $request->session()->put('causeId', $causeId);
            $request->session()->put('userId', $userId);
            $request->session()->put('arrData', $arrData);

            return redirect()->to($responseData['redirect_url']);
        } catch (\Exception $e) {
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

        $resp = $request->all();
        if ($resp['respStatus'] == "A" && $resp['respMessage'] == 'Authorised') {
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
            $request->session()->forget('causeId');
            $request->session()->forget('userId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('causeId');
            $request->session()->forget('userId');
            $request->session()->forget('arrData');

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
