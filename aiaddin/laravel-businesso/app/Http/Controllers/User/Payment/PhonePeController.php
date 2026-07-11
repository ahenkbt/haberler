<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class PhonePeController extends Controller
{

    private $sandboxCheck;

    public function paymentProcess(Request $request, $_amount, $_title, $_success_url, $_cancel_url)
    {
        $user = getUser();
        if (!$user) {
            throw new \Exception('User not found');
        }
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);
        Session::put('payment_title', $_title);


        $paymentMethod = UserPaymentGeteway::where([['user_id', $user->id], ['keyword', 'phonepe']])->first();
        $paymentInfo = json_decode($paymentMethod->information, true);

        if (empty($paymentInfo['merchant_id']) || empty($paymentInfo['salt_key'])) {
            throw new \Exception('Invalid PhonePe configuration');
        }

        $this->sandboxCheck = $paymentInfo['sandbox_check'] ?? 0;
        $clientId = $paymentInfo['merchant_id'];
        $clientSecret = $paymentInfo['salt_key'];

        $accessToken = $this->getPhonePeAccessToken($clientId, $clientSecret);

        if (!$accessToken) {
            return back()->withError('Failed to get PhonePe access token');
        }

        return  $this->initiatePayment($accessToken, $_success_url, $_cancel_url, $_amount);
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
                Session::forget(['merchantOrderId', 'cancel_url']);
                return back()->with('error', 'Failed to initiate payment: ' . ($responseData['message'] ?? 'Unknown error'));
            }
        } catch (\Exception $e) {

            Session::forget(['merchantOrderId', 'cancel_url']);
            return response()->json([
                'success' => false,
                'code' => 'NETWORK_ERROR',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $keywords = getUserKeywords();

        $merchantOrderId = $request->input('merchantOrderId') ??
            Session::get('merchantOrderId') ??
            uniqid();

        $verificationResponse = $this->verifyOrderStatus($merchantOrderId);

        if (array_key_exists('title', $requestData) &&  $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {
            $cancel_url = route('customer.itemcheckout.phonepe.cancel', getParam());
        }

        if ($verificationResponse['success']) {

            $txnId = $request->transactionId;
            $chargeId = $request->transactionId;

            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {

                $bookingId = $request->session()->get('bookingId');
                $bookingInfo = RoomBooking::findOrFail($bookingId);

                $bookingInfo->update(['payment_status' => 1]);
                $roomBooking = new RoomBookingController();

                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);
                Session::forget('bookingId');
            } else {


                $order = $this->saveOrder($requestData, $txnId, $chargeId, 'Completed');
                $order_id = $order->id;
                $this->saveOrderedItems($order_id);
                $this->sendMails($order);
            }

            $this->clearPaymentSession();
            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));

            if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        }
        return redirect($cancel_url);
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
    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        $this->clearPaymentSession();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));

        return redirect()->route('front.user.checkout', getParam());
    }

    private function clearPaymentSession()
    {
        try {
            $keys = [
                'user_request',
                'user_amount',
                'payment_title',
                'merchantOrderId',
                'cancel_url',
                'bookingId'
            ];

            foreach ($keys as $key) {
                if (Session::has($key)) {
                    Session::forget($key);
                }
            }
        } catch (\Exception $e) {
            Session::flash('Failed to clear payment session: ' . $e->getMessage());
        }
    }
}
