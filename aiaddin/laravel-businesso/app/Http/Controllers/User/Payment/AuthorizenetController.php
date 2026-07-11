<?php

namespace App\Http\Controllers\User\Payment;

use Omnipay\Omnipay;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\UserPaymentGeteway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Support\Facades\Session;


class AuthorizenetController extends Controller
{
    use MiscellaneousTrait;
    public $gateway;

    public function __construct()
    {
        $data = UserPaymentGeteway::whereKeyword('Authorize.net')->where('user_id', getUser()->id)->first();
        $paydata = $data->convertAutoData();
        $this->gateway = Omnipay::create('AuthorizeNetApi_Api');
        $this->gateway->setAuthName($paydata['login_id']);
        $this->gateway->setTransactionKey($paydata['transaction_key']);
        if ($paydata['sandbox_check'] == 1) {
            $this->gateway->setTestMode(true);
        }
    }

    public function paymentProcess(Request $request, $_amount, $_cancel_url, $_title, $be)
    {
        $keywords = getUserKeywords();

        if ($request->opaqueDataDescriptor && $request->opaqueDataValue) {

            Session::put('user_request', $request->all());
            // Generate a unique merchant site transaction ID.
            $transactionId = rand(100000000, 999999999);
            $response = $this->gateway->authorize([
                'amount' => $_amount,
                'currency' => $be->base_currency_text,
                'transactionId' => $transactionId,
                'opaqueDataDescriptor' => $request->opaqueDataDescriptor,
                'opaqueDataValue' => $request->opaqueDataValue,
            ])->send();

            $transactionReference = $response->getTransactionReference();
            $response = $this->gateway->capture([
                'amount' => $_amount,
                'currency' => $be->base_currency_text,
                'transactionReference' => $transactionReference,
            ])->send();

            $transaction_id = $response->getTransactionReference();

            // Insert transaction data into the database
            $requestData = Session::get('user_request');
            if ($_title == "Room Booking") {
                $roomBooking = new RoomBookingController();
                $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);
                $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
                $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
                $information['currency_text'] = $currencyInfo->base_currency_text;
                $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
                $information['method'] = 'Authorize.net';
                $information['type'] = 'online';
                $booking_details = $roomBooking->storeData($request, $information);
                $bookingInfo = $booking_details;
                $bookingInfo->update(['payment_status' => 1]);
                // generate an invoice in pdf format
                $invoice = $roomBooking->generateInvoice($bookingInfo);

                // update the invoice field information in database
                $bookingInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with an invoice
                $roomBooking->sendMail($bookingInfo);
            } else {
                $transaction_id = $transaction_id;
                $txnId = $transaction_id;
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

            if ($_title == "Room Booking") {
                return redirect()->route('customer.success.page', [getParam(), 'room-booking']);
            }
            return redirect()->route('customer.success.page', [getParam()]);
        } else {
            return redirect($_cancel_url);
        }
    }

    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
        return redirect()->route('front.user.pricing', getParam());
    }
}
