<?php

namespace App\Http\Controllers\User\DonationManagement\Payment;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Http\Helpers\Uploader;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\UserOfflineGateway;
use App\Rules\ImageMimeTypeRule;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;

class OfflineController extends Controller
{
    use MiscellaneousTrait;
    public function donationProcess(Request $request, $causeId, $userId)
    {
        $offlineGateway = UserOfflineGateway::query()
            ->where('user_id', $userId)
            ->find($request->gateway);

        // check whether attachment is required or not

        if ($offlineGateway->is_receipt == 1) {
            $rules = [
                'attachment' => [
                    'required',
                    new ImageMimeTypeRule()
                ]
            ];

            $validator = Validator::make($request->all(), $rules);

            session()->flash('gatewayId', $offlineGateway->id);

            if ($validator->fails()) {
                return redirect()->back()->withErrors($validator)->withInput();
            }
        }

        $gname = $offlineGateway->name;

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // store attachment in local storage
        if ($request->hasFile('attachment')) {
            $user_id = getUser()->id;
            $attachmentName = Uploader::upload_picture(Constant::WEBSITE_DONATION_ATTACHMENT, $request->file('attachment'), $user_id);
        }

        $arrData = array(
            'name' => empty($request["checkbox"]) ? $request["name"] : "anonymous",
            'email' => empty($request["checkbox"]) ? $request["email"] : "anoymous",
            'phone' => empty($request["checkbox"]) ? $request["phone"] : "anoymous",
            'causeId' => $causeId,
            'amount' => $request->amount,
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => $gname,
            'gatewayType' => 'offline',
            'paymentStatus' => 'pending',
            'attachmentFile' => $request->exists('attachment') ? $attachmentName : null
        );

        $cause = new DonationController();
        // store the course enrolment information in database
        $donationDetails = $cause->store($arrData, $userId);

        // generate an invoice in pdf format
        // $invoice = $cause->generateInvoice($donationDetails,  $userId);

        // then, update the invoice field info in database
        // $donationDetails->update(['invoice' => $invoice]);

        // if ($donationDetails->email) {
        //     // send a mail to the customer with the invoice
        //     $cause->sendMail($donationDetails, $userId);
        // }

        return redirect()->route('front.user.cause_donate.complete', [getParam(), 'via' => 'offline']);
    }
}
