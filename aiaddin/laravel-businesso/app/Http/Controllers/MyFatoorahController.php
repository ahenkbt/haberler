<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Payment\MyFatoorahController as MembershipMyFatoorahController;
use App\Http\Controllers\User\Payment\ShopMyFatoorahController;
use App\Http\Controllers\User\CourseManagement\Payment\MyFatoorahController as CourseMyFatoorahController;
use App\Http\Controllers\User\DonationManagement\Payment\MyFatoorahController as DonationMyFatoorahController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Config;

class MyFatoorahController extends Controller
{
    public function callback(Request $request)
    {
        $type = Session::get('myfatoorah_payment_type');
        if ($type == 'buy_plan') {
            $data = new MembershipMyFatoorahController();
            $data = $data->successPayment($request);
            Session::forget('myfatoorah_payment_type');
            if ($data['status'] == 'success') {
                return redirect()->route('success.page');
            } else {
                $cancel_url = Session::get('cancel_url');
                return redirect($cancel_url);
            }
        } elseif ($type == 'shop_room') {
            try {
                $data = new ShopMyFatoorahController();
                $data = $data->successPayment($request);
                Session::forget('myfatoorah_payment_type');
                $success_url = Session::get('myfatoorah_success_url');
                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($success_url);
            } catch (\Exception $th) {
                $cancel_url = Session::get('myfatoorah_success_url');
                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($cancel_url);
            }
        } elseif ($type == 'course') {
            try {
                $data = new CourseMyFatoorahController();
                $data = $data->successPayment($request);
                Session::forget('myfatoorah_payment_type');
                $success_url = Session::get('myfatoorah_success_url');

                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($success_url);
            } catch (\Exception $th) {
                $cancel_url = Session::get('myfatoorah_success_url');
                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($cancel_url);
            }
        } elseif ($type == 'donation') {
            try {
                $data = new DonationMyFatoorahController();
                $data = $data->successPayment($request);
                Session::forget('myfatoorah_payment_type');
                $success_url = Session::get('myfatoorah_success_url');

                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($success_url);
            } catch (\Exception $th) {
                $cancel_url = Session::get('myfatoorah_success_url');
                Session::forget('myfatoorah_cancel_url');
                Session::forget('myfatoorah_success_url');
                Session::forget('myfatoorah_payment_type');
                Session::forget('user_midtrans');
                return redirect($cancel_url);
            }
        }
    }

    public function cancel()
    {
        return 'cancel';
    }
}
