<?php

namespace App\Http\Controllers\User\CourseManagement\Payment;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
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
    public function enrolmentProcess(Request $request, $courseId, $userId)
    {
        // check whether this course is already enrolled to authenticate user
        $authUser = Auth::guard('customer')->user();
        $status = CourseEnrolment::query()
            ->where('customer_id', $authUser->id)
            ->where('user_id', $userId)
            ->where('course_id', $courseId)
            ->pluck('payment_status')
            ->first();

        if (!is_null($status) && $status == 'pending') {
            session()->flash('warning', 'Your enrolment request for this course is pending.');
            return redirect()->back();
        }

        $offlineGateway = UserOfflineGateway::query()
            ->where('user_id', $userId)
            ->find($request->gateway);

        // check whether attachment is required or not
        if ((session()->has('discountedPrice') && session()->get('discountedPrice') == 0)) {
            $gname = '-';
        } else {
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
        }

        $enrol = new EnrolmentController();

        // do calculation
        $calculatedData = $enrol->calculation($request, $courseId, $userId);

        $currencyInfo = MiscellaneousTrait::getCurrencyInfo($userId);

        // store attachment in local storage
        if ($request->hasFile('attachment')) {
            $user_id = getUser()->id;
            $attachmentName = Uploader::upload_picture(Constant::WEBSITE_ENROLLMENT_ATTACHMENT, $request->file('attachment'), $user_id);
        }


        $arrData = array(
            'courseId' => $courseId,
            'coursePrice' => $calculatedData['coursePrice'],
            'discount' => $calculatedData['discount'],
            'grandTotal' => $calculatedData['grandTotal'],
            'currencyText' => $currencyInfo->base_currency_text,
            'currencyTextPosition' => $currencyInfo->base_currency_text_position,
            'currencySymbol' => $currencyInfo->base_currency_symbol,
            'currencySymbolPosition' => $currencyInfo->base_currency_symbol_position,
            'paymentMethod' => $gname,
            'gatewayType' => 'offline',
            'paymentStatus' => 'pending',
            'attachmentFile' => $request->exists('attachment') ? $attachmentName : null
        );

        if ((session()->has('discountedPrice') && session()->get('discountedPrice') == 0)) {
            $arrData['gatewayType'] = 'online';
            $arrData['paymentStatus'] = 'completed';
        }

        // store the course enrolment information in database
        $enrolmentInfo = $enrol->storeData($arrData, $userId);

        if ((session()->has('discountedPrice') && session()->get('discountedPrice') == 0)) {
            // generate an invoice in pdf format
            $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

            // then, update the invoice field info in database
            $enrolmentInfo->update(['invoice' => $invoice]);

            // send a mail to the customer with the invoice
            $enrol->sendMail($enrolmentInfo, $userId);

            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId, 'via' => 'coupon100']);
        } else {
            return redirect()->route('front.user.course_enrolment.complete', [getParam(), 'id' => $courseId, 'via' => 'offline']);
        }
    }
}
