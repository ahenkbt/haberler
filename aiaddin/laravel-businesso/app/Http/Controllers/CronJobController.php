<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use App\Models\Membership;
use App\Models\BasicSetting;
use App\Models\BasicExtended;
use App\Jobs\SubscriptionExpiredMail;
use App\Jobs\SubscriptionReminderMail;
use Illuminate\Support\Facades\Config;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\Language;
use App\Models\User;
use App\Models\Package;
use App\Http\Helpers\MegaMailer;
use App\Http\Controllers\Controller;
use App\Models\PaymentGateway;
use App\Models\User\DonationManagement\DonationDetail;
use App\Models\User\UserPaymentGeteway;
use App\Models\User\CourseManagement\CourseEnrolment;
use App\Models\User\HotelBooking\RoomBooking;
use App\Models\User\UserOrder;
use App\Http\Controllers\Front\DonationManagement\DonationController;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\Language as UserLanguage;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CronJobController extends Controller
{

    public function expired()
    {
        try {
            $bs = BasicSetting::first();
            $be = BasicExtended::first();

            Config::set('app.timezone', $bs->timezone);
            $exMembers = Membership::whereDate('expire_date', Carbon::now()->subDays(1))->get();
            foreach ($exMembers as $key => $exMember) {
                if (!empty($exMember->user)) {
                    $user = $exMember->user;
                    $currPackage = UserPermissionHelper::userPackage($user->id);

                    if (is_null($currPackage)) {
                        SubscriptionExpiredMail::dispatch($user, $bs, $be);
                    }
                }
            }


            $rmdMembers = Membership::whereDate('expire_date', Carbon::now()->addDays($be->expiration_reminder))->get();

            foreach ($rmdMembers as $key => $rmdMember) {
                if (!empty($rmdMember->user)) {
                    $user = $rmdMember->user;
                    $nextPackageCount = Membership::query()->where([
                        ['user_id', $user->id],
                        ['start_date', '>', Carbon::now()->toDateString()]
                    ])->where('status', '<>', 2)->count();

                    if ($nextPackageCount == 0) {
                        SubscriptionReminderMail::dispatch($user, $bs, $be, $rmdMember->expire_date);
                    }
                }
            }

            Artisan::call("queue:work --stop-when-empty");
        } catch (\Throwable $th) {
            \Illuminate\Support\Facades\Log::error('CronJobController::expired failed', [
                'message' => $th->getMessage(),
                'exception' => $th,
            ]);
        }
    }

    public function check_payment()
    {
        //check iyzico pending payments
        $iyzico_pending_memberships = Membership::where([['status', 0], ['payment_method', 'Iyzico']])->get();
        foreach ($iyzico_pending_memberships as $iyzico_pending_membership) {
            if (!is_null($iyzico_pending_membership->conversation_id)) {
                $result = $this->IyzicoPaymentStatus('admin', null, $iyzico_pending_membership->conversation_id);
                if ($result == 'success') {
                    $this->updateIyzicoPendingMemership($iyzico_pending_membership->id, 1);
                }
            }
        }
        //donation pending payments 
        $iyzico_pending_donations = DonationDetail::where([['payment_method', 'Iyzico'], ['status', 'pending']])->get();
        foreach ($iyzico_pending_donations as $iyzico_pending_donation) {
            if (!is_null($iyzico_pending_donation->conversation_id)) {
                $result = $this->IyzicoPaymentStatus('user', $iyzico_pending_donation->user_id, $iyzico_pending_donation->conversation_id);
                if ($result == 'success') {
                    $this->updateIyzicoPendingDonation($iyzico_pending_donation->id);
                }
            }
        }
        //course enrolments pending payments 
        $iyzico_pending_courses = CourseEnrolment::where([['payment_method', 'Iyzico'], ['payment_status', 'pending']])->get();
        foreach ($iyzico_pending_courses as $iyzico_pending_course) {
            if (!is_null($iyzico_pending_course->conversation_id)) {
                $result = $this->IyzicoPaymentStatus('user', $iyzico_pending_course->user_id, $iyzico_pending_course->conversation_id);
                if ($result == 'success') {
                    $this->updateIyzicoPendingCourse($iyzico_pending_course->id);
                }
            }
        }

        //product orders pending payments 
        $iyzico_pending_orders = UserOrder::where([['method', 'Iyzico'], ['payment_status', 'Pending']])->get();
        foreach ($iyzico_pending_orders as $iyzico_pending_order) {
            if (!is_null($iyzico_pending_order->conversation_id)) {
                $result = $this->IyzicoPaymentStatus('user', $iyzico_pending_order->user_id, $iyzico_pending_order->conversation_id);
                if ($result == 'success') {
                    $this->updateIyzicoPendingOrder($iyzico_pending_order->id);
                }
            }
        }
        //room bookings pending payments 
        $iyzico_pending_bookings = RoomBooking::where([['payment_method', 'Iyzico'], ['payment_status', 0]])->get();
        foreach ($iyzico_pending_bookings as $iyzico_pending_booking) {
            if (!is_null($iyzico_pending_booking->conversation_id)) {
                $result = $this->IyzicoPaymentStatus('user', $iyzico_pending_booking->user_id, $iyzico_pending_booking->conversation_id);
                if ($result == 'success') {
                    $this->updateIyzicoPendingRoomBooking($iyzico_pending_booking->id);
                }
            }
        }
        Artisan::call("queue:work --stop-when-empty");
    }

    /*******************************************************************
     *********** Get iyzico payment status from iyzico server **********
     *******************************************************************/
    private function IyzicoPaymentStatus($type, $user_id, $conversation_id)
    {
        if ($type == 'admin') {
            $paymentMethod = PaymentGateway::where('keyword', 'iyzico')->first();
            $paydata = $paymentMethod->convertAutoData();
        } else {
            $paymentMethod = UserPaymentGeteway::where([['user_id', $user_id], ['keyword', 'iyzico']])->first();
            $paydata = json_decode($paymentMethod->information, true);
        }

        $options = new \Iyzipay\Options();
        $options->setApiKey($paydata['api_key']);
        $options->setSecretKey($paydata['secret_key']);
        if ($paydata['sandbox_status'] == 1) {
            $options->setBaseUrl("https://sandbox-api.iyzipay.com");
        } else {
            $options->setBaseUrl("https://api.iyzipay.com"); // production mode
        }

        $request = new \Iyzipay\Request\ReportingPaymentDetailRequest();
        $request->setPaymentConversationId($conversation_id);

        $paymentResponse = \Iyzipay\Model\ReportingPaymentDetail::create($request, $options);
        $result = (array) $paymentResponse;

        foreach ($result as $key => $data) {
            $data = json_decode($data, true);
            if ($data['status'] == 'success' && !empty($data['payments'])) {
                if (is_array($data['payments'])) {
                    if ($data['payments'][0]['paymentStatus'] == 1) {
                        return 'success';
                    } else {
                        return 'not found';
                    }
                } else {
                    return 'not found';
                }
            } else {
                return 'not found';
            }
        }
        return 'not found';
    }

    /****************************************************************************
     *********** Update pending membership if payment is successfull ***********
     ****************************************************************************/
    private function updateIyzicoPendingMemership($id, $status)
    {
        $currentLang = Language::where('is_default', 1)->first();
        $be = $currentLang->basic_extended;
        $bs = $currentLang->basic_setting;
        $membership = Membership::query()->findOrFail($id);
        $user = User::query()->findOrFail($membership->user_id);
        $package = Package::query()->findOrFail($membership->package_id);
        $count_membership = Membership::query()->where('user_id', $membership->user_id)->count();

        $member['first_name'] = $user->first_name;
        $member['last_name'] = $user->last_name;
        $member['username'] = $user->username;
        $member['email'] = $user->email;
        $data['payment_method'] = $membership->payment_method;

        //comparison date
        $date1 = Carbon::createFromFormat('m/d/Y', \Carbon\Carbon::parse($membership->start_date)->format('m/d/Y'));
        $date2 = Carbon::createFromFormat('m/d/Y', \Carbon\Carbon::now()->format('m/d/Y'));
        $result = $date1->gte($date2);
        if ($result) {
            $data['start_date'] = $membership->start_date;
            $data['expire_date'] = $membership->expire_date;
        } else {
            $data['start_date'] = Carbon::today()->format('d-m-Y');
            if ($package->term === "daily") {
                $data['expire_date'] = Carbon::today()->addDay()->format('d-m-Y');
            } elseif ($package->term === "weekly") {
                $data['expire_date'] = Carbon::today()->addWeek()->format('d-m-Y');
            } elseif ($package->term === "monthly") {
                $data['expire_date'] = Carbon::today()->addMonth()->format('d-m-Y');
            } elseif ($package->term === "lifetime") {
                $data['expire_date'] = Carbon::maxValue()->format('d-m-Y');
            } else {
                $data['expire_date'] = Carbon::today()->addYear()->format('d-m-Y');
            }
            $membership->update(['start_date' =>  Carbon::parse($data['start_date'])]);
            $membership->update(['expire_date' =>  Carbon::parse($data['expire_date'])]);
        }

        // if previous membership package is lifetime, then exipre that membership
        $previousMembership = Membership::query()
            ->where([
                ['user_id', $user->id],
                ['start_date', '<=', Carbon::now()->toDateString()],
                ['expire_date', '>=', Carbon::now()->toDateString()]
            ])
            ->where('status', 1)
            ->orderBy('created_at', 'DESC')
            ->first();
        if (!is_null($previousMembership)) {
            $previousPackage = Package::query()
                ->select('term')
                ->where('id', $previousMembership->package_id)
                ->first();
            if ($previousPackage->term === 'lifetime' || $previousMembership->is_trial == 1) {
                $yesterday = Carbon::yesterday()->format('d-m-Y');
                $previousMembership->expire_date = Carbon::parse($yesterday);
                $previousMembership->save();
            }
        }

        if ($count_membership > 1) {

            $mailTemplate = 'payment_accepted_for_membership_extension_offline_gateway';
            $mailType = 'paymentAcceptedForMembershipExtensionOfflineGateway';
        } else {

            $mailTemplate = 'payment_accepted_for_registration_offline_gateway';
            $mailType = 'paymentAcceptedForRegistrationOfflineGateway';

            $user->update([
                'status' => 1
            ]);
        }
        $filename = $this->makeInvoice($data, "membership", $member, $user->password, $membership->price, "offline", $user->phone, $be->base_currency_symbol_position, $be->base_currency_symbol, $be->base_currency_text, $membership->transaction_id, $package->title, $membership);

        $mailer = new MegaMailer();
        $data = [
            'toMail' => $user->email,
            'toName' => $user->fname,
            'username' => $user->username,
            'package_title' => $package->title,
            'package_price' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $package->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
            'discount' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $membership->discount . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
            'total' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $membership->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
            'activation_date' => $data['start_date'],
            'expire_date' => $package->term == "lifetime" ? 'Lifetime' : $data['expire_date'],
            'membership_invoice' => $filename,
            'website_title' => $bs->website_title,
            'templateType' => $mailTemplate,
            'type' => $mailType
        ];
        $mailer->mailFromAdmin($data);
        $membership->update(['status' => $status]);
    }

    /******************************************************************************
     *********** Update pending order if payment is successfull ***********
     ******************************************************************************/
    private function updateIyzicoPendingOrder($id)
    {
        $order = UserOrder::where('id', $id)->first();
        if ($order) {
            $order->payment_status = 'Completed';
            $order->save();
            $this->sendMails($order);
        }
    }

    /******************************************************************************
     *********** Update pending room booking if payment is successfull ***********
     *******************************************************************************/
    private function updateIyzicoPendingRoomBooking($id)
    {
        $bookingInfo = RoomBooking::where('id', $id)->first();
        if (!empty($bookingInfo)) {
            $bookingInfo->payment_status = 1;
            $bookingInfo->save();
            $roomBooking = new RoomBookingController();

            // generate an invoice in pdf format
            $invoice = $roomBooking->generateInvoice($bookingInfo);

            // update the invoice field information in database
            $bookingInfo->invoice = $invoice;
            $bookingInfo->save();

            // send a mail to the customer with an invoice
            $roomBooking->sendMail($bookingInfo);
        }
    }

    /******************************************************************************
     *********** Update pending donation if payment is successfull ***********
     ******************************************************************************/
    private function updateIyzicoPendingCourse($id)
    {
        $enrol = new EnrolmentController();

        // store the course enrolment information in database
        $enrolmentInfo = CourseEnrolment::where('id', $id)->first();
        $enrolmentInfo->payment_status = 'completed';
        $enrolmentInfo->save();
        if ($enrolmentInfo) {
            // generate an invoice in pdf format
            $invoice = $enrol->generateInvoice($enrolmentInfo, $enrolmentInfo->course_id, $enrolmentInfo->user_id);

            // then, update the invoice field info in database
            $enrolmentInfo->update(['invoice' => $invoice]);

            // send a mail to the customer with the invoice
            $enrol->sendMail($enrolmentInfo, $enrolmentInfo->user_id);
        }
    }

    /******************************************************************************
     *********** Update pending donation if payment is successfull ***********
     *******************************************************************************/
    private function updateIyzicoPendingDonation($id)
    {
        $donate = new DonationController();

        // store the course enrolment information in database
        $donationDetails = DonationDetail::where('id', $id)->first();
        $donationDetails->status = 'completed';
        $donationDetails->save();
        if ($donationDetails) {
            // generate an invoice in pdf format
            $invoice = $donate->generateInvoice($donationDetails, $donationDetails->user_id);

            // then, update the invoice field info in database
            $donationDetails->update(['invoice' => $invoice]);
            if ($donationDetails->email) {
                // dd($donationDetails);
                // send a mail to the customer with the invoice
                $donate->sendMail($donationDetails, $donationDetails->user_id);
            }
        }
    }


}
