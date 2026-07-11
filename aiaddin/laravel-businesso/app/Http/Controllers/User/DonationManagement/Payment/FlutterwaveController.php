<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use KingFlamez\Rave\Facades\Rave as Flutterwave;

class FlutterwaveController extends Controller
{
    use MiscellaneousTrait;
    protected $key, $secret;
    public function __construct()
    {
        $user = getUser();
        $data = UserPaymentGeteway::query()
            ->where('keyword', 'flutterwave')
            ->where('user_id', $user->id)
            ->first();
        $flutterwaveData = json_decode($data->information, true);

        $this->key = $flutterwaveData['public_key'];
        $this->secret = $flutterwaveData['secret_key'];

        config([
            // in case you would like to overwrite values inside config/services.php
            'flutterwave.publicKey' => $this->key,
            'flutterwave.secretKey' => $this->secret,
            'flutterwave.secretHash' => '',
        ]);
    }

    public function donationProcess(Request $request, $causeId, $userId)
    {

        $allowedCurrencies = array('BIF', 'CAD', 'CDF', 'CVE', 'EUR', 'GBP', 'GHS', 'GMD', 'GNF', 'KES', 'LRD', 'MWK', 'MZN', 'NGN', 'RWF', 'SLL', 'STD', 'TZS', 'UGX', 'USD', 'XAF', 'XOF', 'ZMK', 'ZMW', 'ZWD');

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);
        $keywords = getUserKeywords();

        // checking whether the base currency is allowed or not
        if (!in_array($currencyInfo->base_currency_text, $allowedCurrencies)) {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for flutterwave payment.')->withInput();
        }
        $email = empty($request["checkbox"]) ? $request["email"] : $request["flutterwave_email"];

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => $email,
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => 'Flutterwave',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Donate';
        $notifyURL = route('cause_donate.flutterwave.notify', getParam());
        $cancel_url = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        // // generate a payment reference

        $paymentId =  uniqid();
        $curl = curl_init();
        $currency = $currencyInfo->base_currency_text;
        $txref = $paymentId; // ensure you generate unique references per transaction.
        $PBFPubKey = $this->key; // get your public key from the dashboard.
        $redirect_url = $notifyURL;
        $payment_plan = ""; // this



        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/hosted/pay",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'amount' => $request->amount,
                'customer_email' => $email,
                'currency' => $currency,
                'txref' => $txref,
                'PBFPubKey' => $PBFPubKey,
                'redirect_url' => $redirect_url,
                'payment_plan' => $payment_plan
            ]),
            CURLOPT_HTTPHEADER => [
                "content-type: application/json",
                "cache-control: no-cache"
            ],
        ));

        $response = curl_exec($curl);
        $err = curl_error($curl);
        if ($err) {
            // there was an error contacting the rave API
            return redirect($cancel_url)->with('error', 'Curl returned error: ' . $err);
        }


        // put some data in session before redirect to flutterwave url
        $request->session()->put('causeId', $causeId);
        $request->session()->put('arrData', $arrData);
        $request->session()->put('userId', $userId);
        $request->session()->put('paymentId', $paymentId);

        $transaction = json_decode($response);

        if ($transaction->status == 'error' || (!$transaction->data && !$transaction->data->link)) {
            // there was an error from the API
            return redirect($cancel_url)->with('error', 'API returned error: ' . $transaction->message);
        }

        return redirect()->to($transaction->data->link);
    }

    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');

        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');
        $cancelUrl = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        $urlInfo = $request->all();
        $paymentId = Session::get('paymentId');

        if (isset($request['txref'])) {
            $ref = $paymentId;
            $query = array(
                "SECKEY" => $this->secret,
                "txref" => $ref
            );
            $data_string = json_encode($query);
            $ch = curl_init('https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/verify');
            curl_setopt($ch, CURLOPT_CUSTOMREQUEST, "POST");
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data_string);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_HTTPHEADER, array('Content-Type: application/json'));
            $response = curl_exec($ch);
            curl_close($ch);
            $resp = json_decode($response, true);

            if ($resp['status'] == 'error') {
                return redirect($cancelUrl);
            }
            if ($resp['status'] = "success") {
                $cause = new DonationController;

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
                $request->session()->forget('causeId');
                $request->session()->forget('arrData');

                return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
            } else {
                // remove all session data
                $request->session()->forget('userId');
                $request->session()->forget('causeId');
                $request->session()->forget('paymentId');
                $request->session()->forget('arrData');

                return redirect($cancelUrl);
            }
        } else {
            // remove all session data
            $request->session()->forget('userId');
            $request->session()->forget('causeId');
            $request->session()->forget('arrData');

            return redirect($cancelUrl);
        }
    }
}
