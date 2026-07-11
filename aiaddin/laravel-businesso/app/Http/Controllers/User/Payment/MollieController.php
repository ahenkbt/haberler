<?php

namespace App\Http\Controllers\User\Payment;

use Illuminate\Http\Request;
use App\Models\User\BasicSetting;
use Mollie\Laravel\Facades\Mollie;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Config;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\HotelBooking\RoomBooking;
use App\Traits\MiscellaneousTrait;

class MollieController extends Controller
{
    use MiscellaneousTrait;
    public function __construct()
    {
        $data = UserPaymentGeteway::whereKeyword('mollie')->where('user_id', getUser()->id)->first();
        $paydata = $data->convertAutoData();
        Config::set('mollie.key', $paydata['key']);
    }

    public function paymentProcess(Request $request, $_amount, $_success_url, $_cancel_url, $_title, $bex)
    {

        $notify_url = $_success_url;
        $payment = Mollie::api()->payments()->create([
            'amount' => [
                'currency' => $bex->base_currency_text,
                'value' => '' . sprintf('%0.2f', $_amount) . '', // You must send the correct number of decimals, thus we enforce the use of strings
            ],
            'description' => $_title,
            'redirectUrl' => $notify_url,
        ]);
        if ($_title == "Room Booking") {
            $roomBooking = new RoomBookingController();
            $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Mollie';
            $information['type'] = 'online';
            // store the room booking information in database
            $roomBooking = new RoomBookingController();
            $booking_details = $roomBooking->storeData($request, $information);
            $request->session()->put('bookingId', $booking_details->id);
        }
        /** add payment ID to session **/
        Session::put('user_request', $request->all());
        Session::put('user_payment_id', $payment->id);
        Session::put('user_success_url', $_success_url);

        $payment = Mollie::api()->payments()->get($payment->id);


        return redirect($payment->getCheckoutUrl(), 303);
    }

    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $user  = getUser();
        $keywords = getUserKeywords();
        $bs = BasicSetting::where('user_id', $user->id)->firstorFail();

        $cancel_url = Session::get('cancel_url');
        $payment_id = Session::get('user_payment_id');
        /** Get the payment ID before session clear **/
        $payment = Mollie::api()->payments()->get($payment_id);
        if ($payment->status == 'paid') {
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
                $requestData['user_id'] = Auth::guard('customer')->user()->id;
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
        return redirect($cancel_url);
    }
    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));

        return redirect()->route('front.user.pricing', getParam());
    }
}
