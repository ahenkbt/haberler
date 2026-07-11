<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseFaq;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class CourseFaqController extends Controller
{
    public function index(Request $request, $id)
    {
        $information['course'] = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $langs = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $language = $langs->where('code', $request->language)->first();
        $information['defaultLang'] =  $langs->where('dashboard_default', 1)->first();
        $information['langs'] = $langs;
        $information['language'] = $language;
        $information['faqs'] = CourseFaq::where('course_id', $id)
            ->where('language_id', $language->id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->orderByDesc('id')
            ->get();
        return view('user.course_management.faq.index', $information);
    }

    public function store(Request $request, $id)
    {
        $rules = [
            'user_language_id' => 'required',
            'question' => 'required',
            'answer' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        CourseFaq::create($request->except('course_id', 'language_id', 'user_id') + [
            'course_id' => $id,
            'language_id' => $request->user_language_id,
            'user_id' => Auth::guard('web')->user()->id
        ]);

        session()->flash('success', __('New faq added successfully') . '!');

        return "success";
    }

    public function update(Request $request)
    {
        $rules = [
            'question' => 'required',
            'answer' => 'required',
            'serial_number' => 'required'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        CourseFaq::where('user_id', Auth::guard('web')->user()->id)->find($request->id)->update($request->all());
        session()->flash('success', __('FAQ updated successfully') . '!');
        return "success";
    }

    public function destroy($id)
    {
        CourseFaq::where('user_id', Auth::guard('web')->user()->id)->find($id)->delete();
        return redirect()->back()->with('success', __('FAQ deleted successfully') . '!');
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            CourseFaq::find($id)->delete();
        }
        session()->flash('success', __('FAQs deleted successfully') . '!');
        return "success";
    }
}
