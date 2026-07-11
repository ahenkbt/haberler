<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Http\Controllers\Controller;
use App\Http\Requests\User\CourseManagement\CourseCategoryRequest;
use App\Models\User\BasicSetting;
use App\Models\User\CourseManagement\CourseCategory;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $information['langs'] = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['language'] = $information['langs']->where('code', $request->language)->first();
        $information['categories'] = CourseCategory::where('language_id', $information['language']->id)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->orderByDesc('id')
            ->get();
        $information['themeInfo'] = BasicSetting::where('user_id', Auth::guard('web')->user()->id)
            ->select('theme')
            ->first();
        return view('user.course_management.category.index', $information);
    }

    public function store(CourseCategoryRequest $request)
    {
        CourseCategory::create($request->except('language_id', 'slug') + [
            'language_id' => $request->user_language_id,
            'slug' => slug_create($request->name),
            'user_id' => Auth::guard('web')->user()->id
        ]);
        session()->flash('success', __('New course category added successfully') . '!');
        return "success";
    }

    public function updateFeatured(Request $request, $id)
    {
        $category = CourseCategory::where('user_id', Auth::guard('web')->user()->id)->find($id);
        if ($request['is_featured'] == '1') {
            $category->update(['is_featured' => 1]);
            session()->flash('success', __('Category featured successfully') . '!');
        } else {
            $category->update(['is_featured' => 0]);
            session()->flash('success', __('Category unfeatured successfully') . '!');
        }
        return redirect()->back();
    }

    public function update(CourseCategoryRequest $request)
    {
        $cc = CourseCategory::where('user_id', Auth::guard('web')->user()->id)
            ->find($request->id);

        $ins = $request->all();
        $ins['slug'] = slug_create($request->name);
        $cc->update($ins);
        session()->flash('success', __('Course category updated successfully') . '!');
        return "success";
    }

    public function destroy($id)
    {

        $category = CourseCategory::where('user_id', Auth::guard('web')->user()->id)->find($id);
        if ($category->courseInfoList()->where('user_id', Auth::guard('web')->user()->id)->count() > 0) {
            return redirect()->back()->with('warning', __('First delete all the course under to this category') . '!');
        } else {
            $category->delete();
            return redirect()->back()->with('success', __('Course category deleted successfully') . '!');
        }
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->ids;
        $errorOccured = false;
        foreach ($ids as $id) {
            $category = CourseCategory::where('user_id', Auth::guard('web')->user()->id)->find($id);
            $courseCount = $category->courseInfoList()->where('user_id', Auth::guard('web')->user()->id)->count();
            if ($courseCount > 0) {
                $errorOccured = true;
                break;
            } else {
                $category->delete();
            }
        }
        if ($errorOccured == true) {
            session()->flash('warning', __('First delete all the course under to this categories') . '!');
        } else {
            session()->flash('success', __('Course categories deleted successfully') . '!');
        }

        return "success";
    }
}
