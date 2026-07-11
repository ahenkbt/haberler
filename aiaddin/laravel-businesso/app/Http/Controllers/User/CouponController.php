<?php

namespace App\Http\Controllers\User;

use Session;
use Validator;
use Illuminate\Http\Request;
use App\Models\User\UserCoupon;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;

class CouponController extends Controller
{
    public function index(Request $request)
    {
        $data['coupons'] = UserCoupon::where('user_id', Auth::guard('web')->user()->id)->orderBy('id', 'DESC')->paginate(10);
        return view('user.item.order.coupons.index', $data);
    }

    public function store(Request $request)
    {

        $userId = Auth::guard('web')->user()->id;

        $rules = [
            'name' => 'required',
            'type' => 'required',
            'value' => 'required|numeric',
            'minimum_spend' => 'nullable|numeric',
            'start_date' => 'required',
            'end_date' => 'required',
        ];

        $user_coupons = UserCoupon::where('user_id', $userId)->get();

        $rules['code'] = [
            'required',
            function ($attribute, $value, $fail) use ($user_coupons, $request) {
                foreach ($user_coupons as $coupon) {
                    if ($request->code == $coupon->code) {
                        $fail(__('The code already been taken') . '.');
                        break;
                    }
                }
            }
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $input = $request->all();
        $input['user_id'] = $userId;
        $data = new UserCoupon();
        $data->create($input);
        Session::flash('success', __('New coupon added successfully ') . '!');
        return "success";
    }

    public function edit($id)
    {
        $data['coupon'] = UserCoupon::findOrFail($id);
        return view('user.item.order.coupons.edit', $data);
    }

    public function update(Request $request)
    {

        $userId = Auth::guard('web')->user()->id;
        $rules = [
            'name' => 'required',
            // 'code' => 'required|unique:user_coupons,code,' . $request->coupon_id,
            'type' => 'required',
            'value' => 'required|numeric',
            'minimum_spend' => 'nullable|numeric',
            'start_date' => 'required',
            'end_date' => 'required',
        ];

        $user_coupons = UserCoupon::where('user_id', $userId)->get();

        $rules['code'] = [
            'required',
            function ($attribute, $value, $fail) use ($user_coupons, $request) {
                foreach ($user_coupons as $coupon) {
                    if (($request->code == $coupon->code) && ($request->coupon_id != $coupon->id)) {
                        $fail(__('The code already been taken') .'');
                        break;
                    }
                }
            }
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $input = $request->except('_token', 'coupon_id');

        $data = UserCoupon::find($request->coupon_id);
        $data->fill($input)->save();

        Session::flash('success', __('Coupon updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        $coupon = UserCoupon::find($request->coupon_id);
        $coupon->delete();

        $request->session()->flash('success', __('Coupon deleted successfully') . '!');
        return back();
    }
}
