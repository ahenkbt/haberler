<?php

namespace App\Http\Controllers\User\Payment;

use Redirect;
use Carbon\Carbon;
use PayPal\Api\Item;
use PayPal\Api\Payer;
use PayPal\Api\Amount;
use PayPal\Api\Payment;
use PayPal\Api\ItemList;
use PayPal\Api\Transaction;
use PayPal\Rest\ApiContext;
use Illuminate\Http\Request;
use PayPal\Api\RedirectUrls;
use PayPal\Api\PaymentExecution;
use App\Models\User\BasicSetting;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use PayPal\Auth\OAuthTokenCredential;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Session;

class PaypalController extends Controller
{
    private $_api_context;
    use MiscellaneousTrait;
    public function __construct()
    {
        $data = UserPaymentGeteway::whereKeyword('paypal')->where('user_id', getUser()->id)->first();
        $paydata = $data->convertAutoData();

        $paypal_conf = Config::get('paypal');
        $paypal_conf['client_id'] = $paydata['client_id'] ?? '';
        $paypal_conf['secret'] = $paydata['client_secret'] ?? '';
        $paypal_conf['settings']['mode'] = $paydata['sandbox_check'] == 1 ? 'sandbox' : 'live';
        $this->_api_context = new ApiContext(
            new OAuthTokenCredential(
                $paypal_conf['client_id'],
                $paypal_conf['secret']
            )
        );
        $this->_api_context->setConfig($paypal_conf['settings']);
    }

    public function paymentProcess(Request $request, $_amount, $_title, $_success_url, $_cancel_url)
    {

        $title = $_title;
        $price = $_amount;
        $price = round($price, 2);
        $cancel_url = $_cancel_url;
        $success_url = $_success_url;


        $roomBooking = new RoomBookingController();

        // do calculation
        // $calculatedData = $roomBooking->calculation($request);

        // $title = 'Room Booking';
        $user = getUser();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($user->id);

        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = 'PayPal';
        $information['type'] = 'online';



        // changing the currency before redirect to PayPal
        if ($currencyInfo->base_currency_text !== 'USD') {
            $rate = $currencyInfo->base_currency_rate;
            $convertedTotal = $price / $rate;
        }

        $price =  $currencyInfo->base_currency_text === 'USD' ? $price : $convertedTotal;

        $payer = new Payer();
        $payer->setPaymentMethod('paypal');
        $item_1 = new Item();
        $item_1->setName($title)
            /** item name **/
            ->setCurrency("USD")
            ->setQuantity(1)
            ->setPrice($price);
        /** unit price **/
        $item_list = new ItemList();
        $item_list->setItems(array($item_1));
        $amount = new Amount();
        $amount->setCurrency("USD")
            ->setTotal($price);
        $transaction = new Transaction();
        $transaction->setAmount($amount)
            ->setItemList($item_list)
            ->setDescription($title . ' Via Paypal');
        $redirect_urls = new RedirectUrls();
        $redirect_urls->setReturnUrl($success_url)
            /** Specify return URL **/
            ->setCancelUrl($cancel_url);
        $payment = new Payment();
        $payment->setIntent('Sale')
            ->setPayer($payer)
            ->setRedirectUrls($redirect_urls)
            ->setTransactions(array($transaction));
        try {
            $payment->create($this->_api_context);
        } catch (\PayPal\Exception\PPConnectionException $ex) {
            return redirect()->back()->with('error', $ex->getMessage());
        }
        foreach ($payment->getLinks() as $link) {
            if ($link->getRel() == 'approval_url') {
                $redirect_url = $link->getHref();
                break;
            }
        }
        if ($title == "Room Booking") {
            // store the room booking information in database
            $booking_details = $roomBooking->storeData($request, $information);
            Session::put('bookingId', $booking_details->id);
        }
        Session::put('user_request', $request->all());
        Session::put('user_amount', $_amount);


        Session::put('user_paypal_payment_id', $payment->getId());
        if (isset($redirect_url)) {
            /** redirect to paypal **/
            return Redirect::away($redirect_url);
        }
        return redirect()->back()->with('error', 'Unknown error occurred');
    }

    public function successPayment(Request $request)
    {
        $keywords = getUserKeywords();
        $requestData = Session::get('user_request');

        $amount = Session::get('user_amount');
        $user = getUser();
        $be = BasicSetting::where('user_id', $user->id)->firstorFail();
        /** Get the payment ID before session clear **/
        $payment_id = Session::get('user_paypal_payment_id');
        /** clear the session payment ID **/
        if (array_key_exists('title', $requestData) && $requestData['title'] == "Room Booking") {
            $cancel_url = route('front.user.room_booking.cancel', getParam());
        } else {

            $cancel_url = route('customer.itemcheckout.paypal.cancel', getParam());
        }
        if (empty($request['PayerID']) || empty($request['token'])) {
            return redirect($cancel_url);
        }
        $payment = Payment::get($payment_id, $this->_api_context);
        $execution = new PaymentExecution();
        $execution->setPayerId($request['PayerID']);
        /**Execute the payment **/
        $result = $payment->execute($execution, $this->_api_context);
        if ($result->getState() == 'approved') {

            $resp = json_decode($payment, true);
            $txnId = $resp['transactions'][0]['related_resources'][0]['sale']['id'];
            $chargeId = $request->paymentId;

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
            session()->flash('success', $keywords['successful_payment'] ?? __('successful payment'));
            Session::forget('user_request');
            Session::forget('user_amount');
            Session::forget('user_paypal_payment_id');
            if (in_array('title', $requestData) && $requestData['title'] == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        }
        return redirect($cancel_url);
    }

    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
        return redirect()->route('front.user.checkout', getParam());
    }
}
