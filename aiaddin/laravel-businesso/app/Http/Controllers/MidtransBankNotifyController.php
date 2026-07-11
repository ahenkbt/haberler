<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Helpers\UserPermissionHelper;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use App\Models\Language;
use App\Models\Package;
use App\Http\Controllers\Front\CheckoutController;
use App\Http\Controllers\User\UserCheckoutController;
use Carbon\Carbon;
use App\Http\Helpers\MegaMailer;
use App\Http\Controllers\Front\RoomBookingController;
use App\Models\User\HotelBooking\RoomBooking;
use App\Http\Controllers\Front\CourseManagement\EnrolmentController;
use App\Http\Controllers\Front\DonationManagement\DonationController;

class MidtransBankNotifyController extends Controller
{
    public function bank_notify(Request $request)
    {
        $midtrans_payment_type = Session::get('midtrans_payment_type');
        if ($midtrans_payment_type == 'membership') {
            $requestData = Session::get('request');
            $currentLang = session()->has('lang') ?
                (Language::where('code', session()->get('lang'))->first())
                : (Language::where('is_default', 1)->first());
            $bs = $currentLang->basic_setting;
            $be = $currentLang->basic_extended;
            /** Get the payment ID before session clear **/

            $token = Session::get('token');
            if ($request->status_code == 200 && $token == $request->order_id) {
                $paymentFor = Session::get('paymentFor');
                $package = Package::find($requestData['package_id']);
                $transaction_id = UserPermissionHelper::uniqidReal(8);
                $transaction_details = json_encode($request->all());
                if ($paymentFor == "membership") {
                    $amount = $requestData['price'];
                    $password = $requestData['password'];
                    $checkout = new CheckoutController();
                    $user = $checkout->store($requestData, $transaction_id, $transaction_details, $amount, $be, $password);

                    $lastMemb = $user->memberships()->orderBy('id', 'DESC')->first();
                    $activation = Carbon::parse($lastMemb->start_date);
                    $expire = Carbon::parse($lastMemb->expire_date);
                    $file_name = $this->makeInvoice($requestData, "membership", $user, $password, $amount, $requestData["payment_method"], $requestData['phone'], $be->base_currency_symbol_position, $be->base_currency_symbol, $be->base_currency_text, $transaction_id, $package->title, $lastMemb);

                    $mailer = new MegaMailer();
                    $data = [
                        'toMail' => $user->email,
                        'toName' => $user->fname,
                        'username' => $user->username,
                        'package_title' => $package->title,
                        'package_price' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $package->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
                        'discount' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $lastMemb->discount . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
                        'total' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $lastMemb->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
                        'activation_date' => $activation->toFormattedDateString(),
                        'expire_date' => Carbon::parse($expire->toFormattedDateString())->format('Y') == '9999' ? 'Lifetime' : $expire->toFormattedDateString(),
                        'membership_invoice' => $file_name,
                        'website_title' => $bs->website_title,
                        'templateType' => 'registration_with_premium_package',
                        'type' => 'registrationWithPremiumPackage'
                    ];
                    $mailer->mailFromAdmin($data);

                    session()->flash('success', __('successful_payment'));
                    Session::forget('request');
                    Session::forget('paymentFor');
                    return redirect()->route('success.page');
                } elseif ($paymentFor == "extend") {
                    $amount = $requestData['price'];
                    $password = uniqid('qrcode');
                    $checkout = new UserCheckoutController();
                    $user = $checkout->store($requestData, $transaction_id, $transaction_details, $amount, $be, $password);

                    $lastMemb = $user->memberships()->orderBy('id', 'DESC')->first();
                    $activation = Carbon::parse($lastMemb->start_date);
                    $expire = Carbon::parse($lastMemb->expire_date);
                    $file_name = $this->makeInvoice($requestData, "extend", $user, $password, $amount, $requestData["payment_method"], $user->phone, $be->base_currency_symbol_position, $be->base_currency_symbol, $be->base_currency_text, $transaction_id, $package->title, $lastMemb);

                    $mailer = new MegaMailer();
                    $data = [
                        'toMail' => $user->email,
                        'toName' => $user->fname,
                        'username' => $user->username,
                        'package_title' => $package->title,
                        'package_price' => ($be->base_currency_text_position == 'left' ? $be->base_currency_text . ' ' : '') . $package->price . ($be->base_currency_text_position == 'right' ? ' ' . $be->base_currency_text : ''),
                        'activation_date' => $activation->toFormattedDateString(),
                        'expire_date' => Carbon::parse($expire->toFormattedDateString())->format('Y') == '9999' ? 'Lifetime' : $expire->toFormattedDateString(),
                        'membership_invoice' => $file_name,
                        'website_title' => $bs->website_title,
                        'templateType' => 'membership_extend',
                        'type' => 'membershipExtend'
                    ];
                    $mailer->mailFromAdmin($data);

                    session()->flash('success', __('successful_payment'));
                    Session::forget('request');
                    Session::forget('paymentFor');
                    return redirect()->route('success.page');
                }
            } else {
                return redirect()->route('membership.perfect_money.cancel');
            }
        } elseif ($midtrans_payment_type == 'shop_room') {
            $requestData = Session::get('user_request');
            $cancel_url = Session::get('midtrans_cancel_url');
            $success_url = Session::get('midtrans_success_url');

            $token = Session::get('token');
            if ($request->status_code == 200 && $token == $request->order_id) {
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
                session()->flash('success', __('successful_payment'));
                Session::forget('user_request');
                Session::forget('user_amount');

                Session::forget('midtrans_payment_type');
                Session::forget('order_details_url');
                Session::forget('midtrans_cancel_url');
                Session::forget('midtrans_success_url');
                return redirect($success_url);
            } else {
                return redirect($cancel_url);
            }
        } elseif ($midtrans_payment_type == 'course') {
            // get the information from session
            $courseId = $request->session()->get('courseId');
            $userId = $request->session()->get('userId');
            $arrData = $request->session()->get('arrData');
            $cancel_url = Session::get('midtrans_cancel_url');
            $success_url = Session::get('midtrans_success_url');

            $token = Session::get('token');
            if ($request->status_code == 200 && $token == $request->order_id) {
                $enrol = new EnrolmentController();

                // store the course enrolment information in database
                $enrolmentInfo = $enrol->storeData($arrData, $userId);

                // generate an invoice in pdf format
                $invoice = $enrol->generateInvoice($enrolmentInfo, $courseId, $userId);

                // then, update the invoice field info in database
                $enrolmentInfo->update(['invoice' => $invoice]);

                // send a mail to the customer with the invoice
                $enrol->sendMail($enrolmentInfo, $userId);

                // remove all session data
                $request->session()->forget('userId');
                $request->session()->forget('courseId');
                $request->session()->forget('arrData');

                Session::forget('midtrans_payment_type');
                Session::forget('order_details_url');
                Session::forget('midtrans_cancel_url');
                Session::forget('midtrans_success_url');
                return redirect($success_url);
            } else {
                // remove all session data
                $request->session()->forget('userId');
                $request->session()->forget('courseId');
                $request->session()->forget('arrData');

                Session::forget('midtrans_payment_type');
                Session::forget('order_details_url');
                Session::forget('midtrans_cancel_url');
                Session::forget('midtrans_success_url');

                return redirect($cancel_url);
            }
        } elseif ($midtrans_payment_type == 'causes') {
            // get the information from session
            $causeId = $request->session()->get('causeId');
            $userId = $request->session()->get('userId');
            $arrData = $request->session()->get('arrData');
            $success_url = Session::get('midtrans_success_url');
            $cancel_url = Session::get('midtrans_cancel_url');

            $token = Session::get('token');
            if ($request->status_code == 200 && $token == $request->order_id) {
                $donate = new DonationController();

                // store the course enrolment information in database
                $donationDetails = $donate->store($arrData, $userId);
                // generate an invoice in pdf format
                $invoice = $donate->generateInvoice($donationDetails, $userId);

                // then, update the invoice field info in database
                $donationDetails->update(['invoice' => $invoice]);
                if ($donationDetails->email) {
                    // dd($donationDetails);
                    // send a mail to the customer with the invoice
                    $donate->sendMail($donationDetails, $userId);
                }

                // remove all session data
                $request->session()->forget('causeId');
                $request->session()->forget('userId');
                $request->session()->forget('arrData');
                Session::forget('midtrans_payment_type');
                Session::forget('order_details_url');
                Session::forget('midtrans_cancel_url');
                Session::forget('midtrans_success_url');

                return redirect($success_url);
            } else {
                // remove all session data
                $request->session()->forget('causeId');
                $request->session()->forget('userId');
                $request->session()->forget('arrData');

                Session::forget('midtrans_payment_type');
                Session::forget('order_details_url');
                Session::forget('midtrans_cancel_url');
                Session::forget('midtrans_success_url');
                return redirect($cancel_url);
            }
        }
    }

    public function cancel()
    {
        $midtrans_payment_type = Session::get('midtrans_payment_type');
        if ($midtrans_payment_type == 'membership') {
            return redirect()->route('membership.perfect_money.cancel');
        } elseif ($midtrans_payment_type == 'shop_room') {
            $cancel_url = Session::get('midtrans_cancel_url');
            return redirect($cancel_url);
        } elseif ($midtrans_payment_type == 'course') {
            $cancel_url = Session::get('midtrans_cancel_url');
            // remove all session data
            Session::forget('userId');
            Session::forget('courseId');
            Session::forget('arrData');
            Session::forget('midtrans_payment_type');
            Session::forget('order_details_url');
            Session::forget('midtrans_cancel_url');
            Session::forget('midtrans_success_url');

            return redirect($cancel_url);
        } elseif ($midtrans_payment_type == 'causes') {
            $cancel_url = Session::get('midtrans_cancel_url');
            // remove all session data
            Session::forget('causeId');
            Session::forget('userId');
            Session::forget('arrData');

            Session::forget('midtrans_payment_type');
            Session::forget('order_details_url');
            Session::forget('midtrans_cancel_url');
            Session::forget('midtrans_success_url');
            return redirect($cancel_url);
        }
    }
}
