<?php

namespace App\Http\Controllers\User\CourseManagement\Instructor;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Http\Requests\User\CourseManagement\Instructor\InstructorStoreRequest;
use App\Http\Requests\User\CourseManagement\Instructor\InstructorUpdateRequest;
use App\Models\User\BasicSetting;
use App\Models\User\CourseManagement\Instructor\Instructor;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Mews\Purifier\Facades\Purifier;

class InstructorController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View|\Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        // first, get the language info from db
        $information['language'] = Language::query()->where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->first();
        $information['instructors'] = Instructor::query()->where('language_id', $information['language']->id)
            ->orderByDesc('id')
            ->get();
        return view('user.course_management.instructor.index', $information);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Contracts\Foundation\Application|\Illuminate\Contracts\View\Factory|\Illuminate\Contracts\View\View|\Illuminate\Http\Response
     */
    public function create()
    {
        // get all the languages from db
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['languages'] = $languages;
        $information['defaultLang'] = $languages->where('dashboard_default', 1)->first();
        return view('user.course_management.instructor.create', $information);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string
     */
    public function store(InstructorStoreRequest $request)
    {
        $imageName = Uploader::upload_picture(Constant::WEBSITE_INSTRUCTOR_IMAGE, $request->file('image'));

        Instructor::create($request->except('image', 'description', 'user_language_id', 'user_id') + [
            'image' => $imageName,
            'description' => Purifier::clean($request->description),
            'user_id' => Auth::guard('web')->user()->id,
            'language_id' => $request->user_language_id
        ]);

        session()->flash('success', __('New instructor added successfully') . '.');

        return "success";
    }

    /**
     * Update featured status of a specified resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function updateFeatured(Request $request, $id)
    {
        $instructor = Instructor::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);

        if ($request['is_featured'] == 1) {
            $instructor->update(['is_featured' => 1]);
            session()->flash('success', __('Instructor featured successfully') . '!');
        } else {
            $instructor->update(['is_featured' => 0]);
            session()->flash('success', __('Instructor unfeatured successfully') . '!');
        }
        return redirect()->back();
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return \Illuminate\Contracts\View\View
     */
    public function edit(Request $request, $id)
    {
        $information['language'] = Language::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->where('code', $request['language'])
            ->first();
        $information['instructor'] = Instructor::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        return view('user.course_management.instructor.edit', $information);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  int  $id
     * @return string
     */
    public function update(InstructorUpdateRequest $request, $id)
    {
        $instructor = Instructor::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        if ($request->hasFile('image')) {
            $imageName = Uploader::update_picture(Constant::WEBSITE_INSTRUCTOR_IMAGE, $request->file('image'), $instructor->image);
        }
        $instructor->update($request->except('image', 'description') + [
            'image' => $request->hasFile('image') ? $imageName : $instructor->image,
            'description' => Purifier::clean($request->description)
        ]);
        session()->flash('success', __('Instructor updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param  int  $id
     * @return \Illuminate\Http\RedirectResponse
     */
    public function destroy($id)
    {
        $instructor = Instructor::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        
        $courseCount = $instructor->courseList()->count();

        if ($courseCount > 0) {
            return redirect()->back()->with('warning', __('First delete all the courses of this instructor') . '!');
        } else {
            Uploader::remove(Constant::WEBSITE_INSTRUCTOR_IMAGE, $instructor->image);
            $instructor->delete();
            return redirect()->back()->with('success', __('Instructor deleted successfully') . '!');
        }
    }

    /**
     * Remove the selected resources from storage.
     *
     * @param  \Illuminate\Http\Request  $request
     * @return string
     */
    public function bulkDestroy(Request $request)
    {

        $ids = $request->ids;
        $errorOccured = false;

        foreach ($ids as $id) {
            $instructor = Instructor::where('user_id', Auth::guard('web')->user()->id)->find($id);
            $courseCount = $instructor->courseList()->count();
            if ($courseCount > 0) {
                $errorOccured = true;
                break;
            } else {
                Uploader::remove(Constant::WEBSITE_INSTRUCTOR_IMAGE, $instructor->image);
                $instructor->delete();
            }
        }

        if ($errorOccured == true) {
            session()->flash('warning', __('First delete all the courses of those instructors') . '!');
        } else {
            session()->flash('success', __('Instructors deleted successfully') . '!');
        }

        return "success";
    }
}
