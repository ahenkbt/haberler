<?php

namespace App\Http\Controllers\User\Payment;

use Illuminate\Http\Request;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\HotelBooking\RoomBooking;
use App\Traits\MiscellaneousTrait;

class FlutterWaveController extends Controller
{
    use MiscellaneousTrait;
    public $public_key;
    private $secret_key;

    public function __construct()
    {
        $data = UserPaymentGeteway::whereKeyword('flutterwave')->where('user_id', getUser()->id)->first();
        $paydata = $data->convertAutoData();
        $this->public_key = $paydata['public_key'];
        $this->secret_key = $paydata['secret_key'];
    }

    public function paymentProcess(Request $request, $_amount, $_email, $_item_number, $_successUrl, $_cancelUrl, $bex)
    {
        // dd($request, $_amount, $_email, $_item_number, $_successUrl, $_cancelUrl, $bex);
        $cancel_url = $_cancelUrl;
        $notify_url = $_successUrl;
        Session::put('user_request', $request->all());
        Session::put('user_payment_id', $_item_number);
        // SET CURL
        $curl = curl_init();
        $currency = $bex->base_currency_text;
        $txref = $_item_number; // ensure you generate unique references per transaction.
        $PBFPubKey = $this->public_key; // get your public key from the dashboard.
        $redirect_url = $notify_url;
        $payment_plan = ""; // this is only required for recurring payments.


        curl_setopt_array($curl, array(
            CURLOPT_URL => "https://api.ravepay.co/flwv3-pug/getpaidx/api/v2/hosted/pay",
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CUSTOMREQUEST => "POST",
            CURLOPT_POSTFIELDS => json_encode([
                'amount' => $_amount,
                'customer_email' => $_email,
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

        $transaction = json_decode($response);


        // dd($transaction, $this->public_key, $this->secret_key, UserPaymentGeteway::whereKeyword('flutterwave')->where('user_id', getUser()->id)->first());
        if (!$transaction->data && !$transaction->data->link) {
            // there was an error from the API
            return redirect($cancel_url)->with('error', 'API returned error: ' . $transaction->message);
        }

        if ($request['title'] == "Room Booking") {
            $roomBooking = new RoomBookingController();
            $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Flutterwave';
            $information['type'] = 'online';
            $booking_details = $roomBooking->storeData($request, $information);
            $request->session()->put('bookingId', $booking_details->id);
        }
        return redirect()->to($transaction->data->link);
    }

    public function successPayment(Request $request)
    {

        $requestData = Session::get('user_request');
        $user  = getUser();
        $keywords = getUserKeywords();

        $bs = BasicSetting::where('user_id', $user->id)->firstorFail();
        $cancel_url = route('customer.itemcheckout.flutterwave.cancel', getParam());
        /** Get the payment ID before session clear **/
        $payment_id = Session::get('user_payment_id');

        if (isset($request['txref'])) {
            $ref = $payment_id;
            $query = array(
                "SECKEY" => $this->secret_key,
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
                return redirect($cancel_url);
            }
            if ($resp['status'] = "success") {
                $paymentStatus = $resp['data']['status'];
                $paymentFor = Session::get('paymentFor');
                if ($resp['status'] = "success") {
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

                        // remove all session data
                        $request->session()->forget('bookingId');
                    } else {
                        $txnId = UserPermissionHelper::uniqidReal(8);
                        $chargeId = $request->paymentId;
                        $order = $this->saveOrder($requestData, $txnId, $chargeId, 'Completed');
                        $order_id = $order->id;
                        $this->saveOrderedItems($order_id);
                        $this->sendMails($order);
                    }

                    session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
                    Session::forget('user_request');
                    Session::forget('user_amount');
                    Session::forget('user_paypal_payment_id');
                    if (in_array('title', $requestData) &&  $requestData['title'] == "Room Booking") {
                        return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
                    }
                    return redirect()->route('customer.success.page', [getParam()]);
                }
            }
            return redirect($cancel_url);
        }
        return redirect($cancel_url);
    }

    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
        return redirect()->route('front.user.pricing', getParam());
    }
}
