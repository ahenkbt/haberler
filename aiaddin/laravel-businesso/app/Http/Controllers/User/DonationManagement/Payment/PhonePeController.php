<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Session;

class PhonePeController extends Controller
{
    use MiscellaneousTrait;
    private $sandboxCheck;

    public function donationProcess(Request $request, $causeId, $userId)
    {
        $user = getUser();
        $keywords = getUserKeywords();

        $enrol = new DonationController();
        // do calculation
        $amount = $request->amount;
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // checking whether the base currency is allowed or not
        if ($currencyInfo->base_currency_text != 'INR') {
            return redirect()->back()->with('error', $keywords['Invalid_currency'] ?? 'Invalid currency for phonepe payment.');
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
            'paymentMethod' => 'PhonePe',
            'gatewayType' => 'online',
            'paymentStatus' => 'completed'
        );

        $title = 'Given Donation';
        $notifyURL = route('cause_donation.phonepe.notify', getParam());
        $cancelURL = route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);

        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'phonepe']])->first();
        $paymentInfo = json_decode($paymentMethod->information, true);

        if (empty($paymentInfo['merchant_id']) || empty($paymentInfo['salt_key'])) {
            throw new \Exception('Invalid PhonePe configuration');
        }

        $this->sandboxCheck = $paymentInfo['sandbox_check'] ?? 0;
        $clientId = $paymentInfo['merchant_id'];
        $clientSecret = $paymentInfo['salt_key'];

        // put some data in session before redirect to paypal url
        $request->session()->put('causeId', $causeId);
        $request->session()->put('userId', $userId);
        $request->session()->put('arrData', $arrData);

        $accessToken = $this->getPhonePeAccessToken($clientId, $clientSecret);

        if (!$accessToken) {
            return back()->withError('Failed to get PhonePe access token');
        }

        return  $this->initiatePayment($accessToken, $notifyURL, $cancelURL, $amount);
    }

    private function getPhonePeAccessToken($clientId, $clientSecret)
    {
        return Cache::remember('phonepe_access_token', 3500, function () use ($clientId, $clientSecret) {

            $tokenUrl = $this->sandboxCheck
                ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
                : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token';

            $response = Http::asForm()->post($tokenUrl, [
                'client_id' => $clientId,
                'client_secret' => $clientSecret,
                'client_version' => 1,
                'grant_type' => 'client_credentials'
            ]);

            if ($response->successful()) {
                return $response->json()['access_token'];
            }
            return null;
        });
    }

    public function initiatePayment($accessToken, $successUrl, $cancelUrl, $_amount)
    {
        $baseUrl = $this->sandboxCheck
            ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
            : 'https://api.phonepe.com/apis/pg';

        $endpoint = '/checkout/v2/pay';

        // Generate a unique merchantOrderId and store it in the session
        $merchantOrderId = uniqid();
        Session::put('merchantOrderId', $merchantOrderId);
        Session::put('cancel_url', $cancelUrl);

        //here we preapare the parameter of the request 
        $payload = [
            'merchantOrderId' => $merchantOrderId,
            'amount' => intval($_amount * 100), //you have to multiply the amount by 100 to convert it to paise
            'paymentFlow' => [
                'type' => 'PG_CHECKOUT',
                'merchantUrls' => [
                    'redirectUrl' => $successUrl,
                    'cancelUrl' => $cancelUrl
                ]
            ]
        ];

        try {
            //after preparing the parameter we send a request to create a payment link
            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => 'O-Bearer ' . $accessToken,
            ])->post($baseUrl . $endpoint, $payload);

            $responseData = $response->json();

            //after successfully created the payment link of we redirect the user to api responsed redirectUrl
            if ($response->successful() && isset($responseData['redirectUrl'])) {
                return redirect()->away($responseData['redirectUrl']);
            } else {
                // Handle API errors
                $this->clearSession(request());
                return back()->with('error', 'Failed to initiate payment: ' . ($responseData['message'] ?? 'Unknown error'));
            }
        } catch (\Exception $e) {

            $this->clearSession(request());
            return response()->json([
                'success' => false,
                'code' => 'NETWORK_ERROR',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function notify(Request $request)
    {
        // get the information from session
        $causeId = $request->session()->get('causeId');
        $userId = $request->session()->get('userId');
        $arrData = $request->session()->get('arrData');

        $merchantOrderId = $request->input('merchantOrderId') ??
            Session::get('merchantOrderId') ??
            uniqid();

        $verificationResponse = $this->verifyOrderStatus($merchantOrderId);

        if ($verificationResponse['success']) {
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
            $this->clearSession($request);

            return redirect()->route('front.user.cause_donate.complete', [getParam(), 'donation']);
        } else {

            $this->clearSession($request);

            return redirect()->route('front.user.cause_donate.cancel', [getParam(), 'id' => $causeId]);
        }
    }

    private function verifyOrderStatus($merchantOrderId)
    {
        $user = getUser();
        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'phonepe']])->first();
        $paymentInfo = json_decode($paymentMethod->information, true);
        $this->sandboxCheck = $paymentInfo['sandbox_check'] ?? 0;

        try {

            $accessToken = $this->getPhonePeAccessToken(
                $paymentInfo['merchant_id'],
                $paymentInfo['salt_key']
            );

            if (!$accessToken) {
                throw new \Exception('Failed to get access token');
            }

            $baseUrl = $this->sandboxCheck
                ? 'https://api-preprod.phonepe.com/apis/pg-sandbox'
                : 'https://api.phonepe.com/apis/pg';

            $endpoint = "/checkout/v2/order/{$merchantOrderId}/status";

            $response = Http::withHeaders([
                'Content-Type' => 'application/json',
                'Authorization' => 'O-Bearer ' . $accessToken,
            ])->get($baseUrl . $endpoint);

            if ($response->successful()) {
                $responseData = $response->json();

                if ($responseData['state'] === 'COMPLETED') {
                    return [
                        'success' => true,
                        'state' => $responseData['state'],
                        'amount' => $responseData['amount'] ?? null,
                        'data' => $responseData,
                    ];
                }
                return [
                    'success' => false,
                    'error' => 'Payment not completed: ' . ($responseData['state'] ?? 'Unknown state'),
                ];
            } else {
                return [
                    'success' => false,
                    'error' => $response->json() ?? 'Unknown error'
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    private function clearSession(Request $request)
    {
        $request->session()->forget('causeId');
        $request->session()->forget('userId');
        $request->session()->forget('arrData');
        $request->session()->forget('merchantOrderId');
        $request->session()->forget('cancel_url');
    }
}
