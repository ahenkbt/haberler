<?php

namespace App\Http\Controllers\User\Payment;

use Instamojo\Instamojo;
use Illuminate\Http\Request;
use App\Models\User\BasicSetting;
use PHPMailer\PHPMailer\Exception;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\UserPaymentGeteway;
use Illuminate\Support\Facades\Session;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\HotelBooking\RoomBooking;
use App\Traits\MiscellaneousTrait;

class InstamojoController extends Controller
{
    use MiscellaneousTrait;
    public function paymentProcess(Request $request, $_amount, $_success_url, $_cancel_url, $_title, $bex)
    {
        $data = UserPaymentGeteway::whereKeyword('instamojo')->where('user_id', getUser()->id)->first();

        $paydata = $data->convertAutoData();
        $cancel_url = $_cancel_url;
        $notify_url = $_success_url;

        if ($paydata['sandbox_check'] == 1) {
            $api = new Instamojo($paydata['key'], $paydata['token'], 'https://test.instamojo.com/api/1.1/');
        } else {
            $api = new Instamojo($paydata['key'], $paydata['token']);
        }
        if ($_title == 'Room Booking') {
            $roomBooking = new RoomBookingController();
            $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);
            $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
            $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
            $information['currency_text'] = $currencyInfo->base_currency_text;
            $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
            $information['method'] = 'Instamojo';
            $information['type'] = 'online';
            $booking_details = $roomBooking->storeData($request, $information);
            $request->session()->put('bookingId', $booking_details->id);
        }

        try {
            $response = $api->paymentRequestCreate(array(
                "purpose" => $_title,
                "amount" => $_amount,
                "send_email" => false,
                "email" => null,
                "redirect_url" => $notify_url
            ));
            $redirect_url = $response['longurl'];
            Session::put("user_request", $request->all());
            Session::put('user_payment_id', $response['id']);
            Session::put('user_success_url', $notify_url);
            Session::put('user_cancel_url', $cancel_url);

            return redirect($redirect_url);
        } catch (Exception $e) {
            return redirect($cancel_url)->with('error', 'Error: ' . $e->getMessage());
        }
    }

    public function successPayment(Request $request)
    {
        $requestData = Session::get('user_request');
        $user = getUser();
        $keywords = getUserKeywords();

        $be = BasicSetting::where('user_id', $user->id)->firstorFail();

        $success_url = Session::get('user_success_url');
        $cancel_url = Session::get('user_cancel_url');
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
            session()->forget('bookingId');
        } else {
            /** Get the payment ID before session clear **/
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
        return redirect($cancel_url);
    }

    public function cancelPayment()
    {
        $keywords = getUserKeywords();
        session()->flash('warning', $keywords['cancel_payment'] ?? __('cancel payment'));
        return redirect()->route('front.user.pricing', getParam());
    }
}
