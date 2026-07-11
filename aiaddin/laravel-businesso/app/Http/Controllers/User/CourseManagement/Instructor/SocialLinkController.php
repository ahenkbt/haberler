<?php

namespace App\Http\Controllers\User\CourseManagement\Instructor;

use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Models\User\CourseManagement\Instructor\SocialLink;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class SocialLinkController extends Controller
{
    public function links($id)
    {
        $information['defaultLang'] = Language::where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();
        $information['instructor'] = Instructor::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $information['socialLinks'] = SocialLink::where('instructor_id', $id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->orderByDesc('id')
            ->get();

        return view('user.course_management.instructor.social-links.index', $information);
    }

    public function storeLink($id, Request $request)
    {
        $rules = [
            'icon' => 'required',
            'url' => 'required|url',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        SocialLink::create($request->except('instructor_id', 'user_id') + [
            'instructor_id' => $id,
            'user_id' => Auth::guard('web')->user()->id
        ]);

        session()->flash('success', __('New social link added successfully') . '!');

        return "success";
    }

    public function editLink($instructor_id, $id)
    {
        $information['instructor'] = Instructor::where('user_id', Auth::guard('web')->user()->id)->where('id', $instructor_id)->first();
        $information['socialLink'] = SocialLink::where('user_id', Auth::guard('web')->user()->id)->find($id);
        return view('user.course_management.instructor.social-links.edit', $information);
    }

    public function updateLink(Request $request, $id)
    {
        $rules = [
            'url' => 'required|url',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        SocialLink::where('user_id', Auth::guard('web')->user()->id)->find($id)->update($request->all());
        session()->flash('success', __('Social link updated successfully') . '!');
        return "success";
    }

    public function destroyLink($id)
    {
        SocialLink::where('user_id', Auth::guard('web')->user()->id)->find($id)->delete();
        return redirect()->back()->with('success', __('Social link deleted successfully') . '!');
    }
}
