<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\CourseManagement\CourseCouponRequest;
use App\Models\User\CourseManagement\Coupon;
use App\Models\User\CourseManagement\Course;
use App\Models\User\Language;
use App\Traits\MiscellaneousTrait;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CouponController extends Controller
{
    use MiscellaneousTrait;
    public function index()
    {
        $information['coupons'] = Coupon::where('user_id', Auth::guard('web')->user()->id)->orderByDesc('id')->get();
        $information['courses'] = Course::where('status', 'published')->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['deLang'] = Language::where('dashboard_default', 1)->where('user_id', Auth::guard('web')->user()->id)->first();
        $information['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo(Auth::guard('web')->user()->id);
        return view('user.course_management.coupon.index', $information);
    }

    public function store(CourseCouponRequest $request)
    {
        
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        Coupon::create($request->except('start_date', 'end_date', 'courses') + [
            'courses' => json_encode($request->courses),
            'user_id' => Auth::guard('web')->user()->id,
            'start_date' => date_format($startDate, 'Y-m-d'),
            'end_date' => date_format($endDate, 'Y-m-d')
        ]);
        session()->flash('success', __('New coupon added successfully') . '!');
        return "success";
    }

    public function update(CourseCouponRequest $request)
    {
        $startDate = Carbon::parse($request->start_date);
        $endDate = Carbon::parse($request->end_date);
        $courses = !empty($request->courses) ? json_encode($request->courses) : NULL;

        Coupon::where('user_id', Auth::guard('web')->user()->id)->find($request->id)->update(
            $request->except('start_date', 'end_date', 'courses') + [
                'courses' => $courses,
                'start_date' => date_format($startDate, 'Y-m-d'),
                'end_date' => date_format($endDate, 'Y-m-d')
            ]
        );
        session()->flash('success', __('Coupon updated successfully') . '!');
        return "success";
    }

    public function destroy($id)
    {
        Coupon::where('user_id', Auth::guard('web')->user()->id)
            ->find($id)
            ->delete();
        return redirect()->back()->with('success', __('Coupon deleted successfully') . '!');
    }
}
