<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Lesson;
use App\Models\User\CourseManagement\Module;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;
use App\Http\Helpers\Uploader;
use Illuminate\Support\Facades\DB;

class LessonController extends Controller
{
    public function store($id, Request $request)
    {
        $module = Module::select('language_id')->find($id);

        $rules = [
            'title' => 'required',
            'status' => 'required',
            'serial_number' => 'required'
        ];
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }


        Lesson::create($request->except('module_id') + [
            'module_id' => $id,
            'language_id' => $module->language_id,
            'user_id' => Auth::guard('web')->user()->id
        ]);
        session()->flash('success', __('New lesson added successfully') . '!');
        return "success";
    }

    public function update(Request $request)
    {
        $lesson = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($request->id);

        $rules = [
            'title' => 'required',
            'status' => 'required',
            'serial_number' => 'required'
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $lesson->update($request->all());
        session()->flash('success', __('Lesson updated successfully') . '!');
        return "success";
    }

    public function destroy($id)
    {

        $lesson = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $lessonContents = $lesson->content()->get();

        foreach ($lessonContents as $lessonContent) {
            if ($lessonContent->type == 'video') {
                Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $lessonContent->video_unique_name);
            } else if ($lessonContent->type == 'file') {
                Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $lessonContent->file_unique_name);
            } else if ($lessonContent->type == 'quiz') {
                $lessonQuizzes = $lessonContent->quiz()->get();
                foreach ($lessonQuizzes as $lessonQuiz) {
                    $lessonQuiz->delete();
                }
            }
            $lessonContent->delete();
        }

        // find out the module of this lesson
        $module = $lesson->module;

        $lesson->delete();

        // update module's total period
        $totalLessonPeriod = Lesson::where('user_id', Auth::guard('web')->user()->id)->where('module_id', $module->id)->sum(DB::raw('TIME_TO_SEC(duration)'));

        $moduleDuration = gmdate('H:i:s', $totalLessonPeriod);

        $module->update([
            'duration' => $moduleDuration
        ]);

        // update course's total period
        $totalModulePeriod = Module::where('course_information_id', $module->course_information_id)->sum(DB::raw('TIME_TO_SEC(duration)'));

        $courseDuration = gmdate('H:i:s', $totalModulePeriod);

        $course = $module->courseInformation->course;
        $course->update([
            'duration' => $courseDuration
        ]);

        return redirect()->back()->with('success', __('Lesson deleted successfully') . '!');
    }
}
