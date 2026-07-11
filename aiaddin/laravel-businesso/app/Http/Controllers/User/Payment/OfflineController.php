<?php

namespace App\Http\Controllers\User\Payment;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\UserOfflineGateway;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class OfflineController extends Controller
{
    use MiscellaneousTrait;
    public function bookingProcess(Request $request)
    {
        $offlineMethod = UserOfflineGateway::findOrFail($request->paymentType);

        // check whether attachment is required or not
        if ($offlineMethod->attachment_status == 1) {
            $rules = [
                'attachment' => 'required|mimes:jpg,jpeg,png'
            ];

            $validator = Validator::make($request->all(), $rules);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator->errors())->withInput();
            }
        }

        // store attachment in local storage
        if ($request->hasFile('attachment')) {
            $img = $request->file('attachment');
            $img_name = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/img/attachments/rooms/');

            if (!file_exists($directory)) {
                mkdir($directory, 0775, true);
            }

            $img->move($directory, $img_name);
        }

        $roomBooking = new RoomBookingController();

        // do calculation
        $calculatedData = $roomBooking->calculation($request);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo(getUser()->id);

        // $information['subtotal'] = $calculatedData['subtotal'];
        // $information['discount'] = $calculatedData['discount'];
        // $information['total'] = $calculatedData['total'];
        $information['currency_symbol'] = $currencyInfo->base_currency_symbol;
        $information['currency_symbol_position'] = $currencyInfo->base_currency_symbol_position;
        $information['currency_text'] = $currencyInfo->base_currency_text;
        $information['currency_text_position'] = $currencyInfo->base_currency_text_position;
        $information['method'] = $offlineMethod->name;
        $information['type'] = 'offline';
        $information['attachment'] = $request->hasFile('attachment') ? $img_name : null;

        // store the room booking information in database
        $booking_details = $roomBooking->storeData($request, $information);

        $bookingInfo = RoomBooking::findOrFail($booking_details->id);

        // generate an invoice in pdf format
        $invoice = $roomBooking->generateInvoice($bookingInfo);

        // update the invoice field information in database
        $bookingInfo->update(['invoice' => $invoice]);

        // send a mail to the customer with an invoice
        $roomBooking->sendMail($bookingInfo);

        return ;
    }
}
