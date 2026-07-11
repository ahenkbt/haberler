<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Traits\MiscellaneousTrait;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Session;
use Midtrans\Snap;
use Midtrans\Config as MidtransConfig;

class MidtransController extends Controller
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
        if ($currencyInfo->base_currency_text != 'IDR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for midtrans payment.');
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
            'paymentMethod' => 'Midtrans',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );
        $user = getUser();
        $notifyURL = route('cause_donation.midtrans.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Purchase End ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

        /* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~ Payment Gateway Info ~~~~~~~~~~~~~~
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'midtrans']])->first();
        $paydata = $paymentMethod->convertAutoData();
        // will come from database
        MidtransConfig::$serverKey = $paydata['server_key'];
        MidtransConfig::$isProduction = $paydata['is_production'] == 0 ? true : false;
        MidtransConfig::$isSanitized = true;
        MidtransConfig::$is3ds = true;
        $token = uniqid();
        Session::put('token', $token);
        $params = [
            'transaction_details' => [
                'order_id' => $token,
                'gross_amount' => $amount * 1000, // will be multiplied by 1000
            ],
            'customer_details' => [
                'first_name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
                'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous@gmail.com",
                'phone' => empty($request["checkbox"]) ? $request["phone"] : "99999999999",
            ],
        ];

        $snapToken = Snap::getSnapToken($params);

        // put some data in session before redirect to midtrans url
        if (
            $paydata['is_production'] == 1
        ) {
            $is_production = $paydata['is_production'];
        }
        $data['title'] = "Donation via midtrans";
        $data['snapToken'] = $snapToken;
        $data['is_production'] = $is_production;
        $data['success_url'] = $notifyURL;
        $data['_cancel_url'] = $cancelURL;
        $data['client_key'] = $paydata['server_key'];
        // put some data in session before redirect to xendit url
        $request->session()->put('causeId', $causeId);
        $request->session()->put('userId', $userId);
        $request->session()->put('arrData', $arrData);

        //put data into session for midtrans bank notify
        Session::put('user_midtrans', $user);
        Session::put('midtrans_payment_type', 'causes');
        Session::put('midtrans_cancel_url', route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]));
        Session::put('midtrans_success_url', route('front.user.cause_donate.complete', [getParam(), 'donation']));


        return view('payments.midtrans-membership', $data);
    }

    // return to success page
    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $token = Session::get('token');
        if ($request->status_code == 200 && $token == $request->order_id) {
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
            $request->session()->forget('causeId', $causeId);
            $request->session()->forget('userId', $userId);
            $request->session()->forget('arrData', $arrData);

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {
            // remove all session data
            $request->session()->forget('causeId', $causeId);
            $request->session()->forget('userId', $userId);
            $request->session()->forget('arrData', $arrData);
            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }
}
