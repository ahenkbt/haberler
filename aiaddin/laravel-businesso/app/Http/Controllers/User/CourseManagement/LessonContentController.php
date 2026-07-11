<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Http\Helpers\UserPermissionHelper;
use App\Models\User\BasicSetting;
use App\Models\User\CourseManagement\Lesson;
use App\Models\User\CourseManagement\LessonContent;
use App\Models\User\CourseManagement\Module;
use App\Models\User\Language;
use App\Models\User\UserPermission;
use Illuminate\Contracts\Filesystem\FileNotFoundException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class LessonContentController extends Controller
{
    public function contents($id, Request $request)
    {
        $lesson = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $information['lesson'] = $lesson;


        $module = $lesson->module;
        $courseInfo = $module->courseInformation;
        $information['module'] = $module;
        $information['courseInfo'] = $courseInfo;
        $information['contents'] = $lesson->content()->orderBy('order_no', 'asc')->get();
        $information['language'] = Language::query()->where('code', $request->language)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();
        return view('user.course_management.lesson-content.index', $information);
    }

    public function uploadVideo(Request $request)
    {

        $video_size_limit = UserPermissionHelper::currentPackagePermission(Auth::guard('web')->user()->id)->video_size_limit;

        $maxSize = intval($video_size_limit);
        $convertedSize = $maxSize * 1024;

        $rules = [
            'video' => [
                'required',
                'max:' . $convertedSize,
                function ($attribute, $value, $fail) use ($request) {
                    $video = $request->file('video');
                    $vidExt = $video->getClientOriginalExtension();

                    if ($vidExt != 'mp4') {
                        $fail(__("Only .mp4 file is allowed for") . ' ' . $attribute);
                    }
                }
            ]
        ];

        // $message = [
        //     'video.max' => 'The video must not be greater than ' . $maxSize . ' megabytes.'
        // ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $videoData = Uploader::upload_video(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $request->file('video'));
        return Response::json([
            'originalName' => $videoData['originalName'],
            'uniqueName' => $videoData['uniqueName'],
            'duration' => $videoData['duration']
        ]);
    }

    public function removeVideo(Request $request)
    {
        if (empty($request['title'])) {
            return Response::json(['error' => __('The request has no file name') . '.'], 400);
        } else {
            Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $request['title']);
            return Response::json(['success' => __('The file has been deleted') . '.'], 200);
        }
    }

    public function storeVideo(Request $request, $id)
    {
        $rule  = [];


        if (empty($request['vid_org']) || empty($request['vid_unq'])) {
            $rule['video_content'] = 'required';

        }

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $unqNames = $request['vid_unq'];
        $orgNames = $request['vid_org'];
        $durations = $request['vid_time'];

        $maxOrderNo = LessonContent::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->where('lesson_id', $id)
            ->max('order_no');

        for ($i = 0; $i < sizeOf($unqNames); $i++) {
            $lessonContent = new LessonContent();
            $lessonContent->lesson_id = $id;
            $lessonContent->video_unique_name = $unqNames[$i];
            $lessonContent->video_original_name = $orgNames[$i];
            $lessonContent->video_duration = $durations[$i];
            $lessonContent->type = 'video';
            $lessonContent->order_no = $maxOrderNo + 1;
            $lessonContent->user_id = Auth::guard('web')->user()->id;
            $lessonContent->save();
        }
        // store lesson's total period
        $totalPeriod = LessonContent::where([
            ['user_id', Auth::guard('web')->user()->id],
            ['lesson_id', $id],
            ['type', 'video']
        ])->sum(DB::raw('TIME_TO_SEC(video_duration)'));

        $lessonDuration = gmdate('H:i:s', $totalPeriod);
        $lesson = Lesson::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        $lesson->update([
            'duration' => $lessonDuration
        ]);
        // store module's total period
        $totalLessonPeriod = Lesson::query()->where('user_id', Auth::guard('web')->user()->id)
            ->where('module_id', $lesson->module_id)
            ->sum(DB::raw('TIME_TO_SEC(duration)'));
        $moduleDuration = gmdate('H:i:s', $totalLessonPeriod);
        $module = $lesson->module;
        $module->update([
            'duration' => $moduleDuration
        ]);

        // store course's total period
        $totalModulePeriod = Module::query()
            ->where('course_information_id', $module->course_information_id)
            ->sum(DB::raw('TIME_TO_SEC(duration)'));
        $courseDuration = gmdate('H:i:s', $totalModulePeriod);
        $course = $module->courseInformation->course;
        $course->update([
            'duration' => $courseDuration
        ]);
        session()->flash('success', __('Video added successfully') . '!');
        return "success";
    }

    public function videoPreview(Request $request)
    {
        $allowedExts = array('jpg', 'png', 'jpeg');

        $rules = [
            'video_preview' => [
                'required',
                function ($attribute, $value, $fail) use ($request, $allowedExts) {
                    $video = $request->file('video_preview');
                    $vidExt = $video->getClientOriginalExtension();
                    if (!in_array($vidExt, $allowedExts)) {
                        return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                    }
                }
            ]
        ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        if ($request->hasFile('video_preview')) {
            $content = LessonContent::find($request->content_id);
            $vidPrev = Uploader::update_picture(Constant::WEBSITE_LESSON_CONTENT_VIDEO_PREVIEW, $request->file('video_preview'), basename($content->video_preview));
            $content->video_preview = $vidPrev;
            $content->save();
        }

        Session::flash('success', __('Video preview updated successfully') . '!');
        return "success";
    }

    public function uploadFile(Request $request)
    {

        $file_size_limit = UserPermissionHelper::currentPackagePermission(Auth::guard('web')->user()->id)->file_size_limit;

        $maxSize = intval($file_size_limit);

        $convertedSize = $maxSize * 1024;

        $rules = [
            'file' => [
                'required',
                'max:' . $convertedSize,
                function ($attribute, $value, $fail) use ($request) {
                    $file = $request->file('file');
                    $fileExt = $file->getClientOriginalExtension();
                    $allowedExts = array('txt', 'doc', 'docx', 'pdf', 'zip');
                    if (!in_array($fileExt, $allowedExts)) {
                        $fail(__("Only .txt, .doc, .docx, .pdf & .zip file is allowed for") . ' ' . $attribute);
                    }
                }
            ]
        ];

        // $message = [
        //     'file.max' => 'The file must not be greater than ' . $maxSize . ' megabytes.'
        // ];

        $validator = Validator::make($request->all(), $rules);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $fileData = Uploader::upload_file(Constant::WEBSITE_LESSON_CONTENT_FILE, $request->file('file'));
        return Response::json([
            'originalName' => $fileData['originalName'],
            'uniqueName' => $fileData['uniqueName']
        ]);
    }

    public function removeFile(Request $request)
    {
        if (empty($request['title'])) {
            return Response::json(['error' => __('The request has no file name') . '.'], 400);
        } else {
            Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $request['title']);
            return Response::json(['success' => __('The file has been deleted') . '.']);
        }
    }

    public function storeFile(Request $request, $id)
    {
        $rule =  [];
        if (empty($request['file_org']) || empty($request['file_unq'])) {
            $rule['file_content'] = 'required';
        }

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $unqNames = $request['file_unq'];
        $orgNames = $request['file_org'];

        $maxOrderNo = LessonContent::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->where('lesson_id', $id)
            ->max('order_no');

        for ($i = 0; $i < sizeOf($unqNames); $i++) {
            $lessonContent = new LessonContent();
            $lessonContent->lesson_id = $id;
            $lessonContent->file_unique_name = $unqNames[$i];
            $lessonContent->file_original_name = $orgNames[$i];
            $lessonContent->type = 'file';
            $lessonContent->order_no = $maxOrderNo + 1;
            $lessonContent->user_id = Auth::guard('web')->user()->id;
            $lessonContent->save();
        }
        session()->flash('success', __('File added successfully') . '!');
        return "success";
    }

    public function downloadFile($id)
    {
        $bs = BasicSetting::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();
        $content = LessonContent::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->find($id);
        try {
            return Uploader::downloadFile(Constant::WEBSITE_LESSON_CONTENT_FILE, $content->file_unique_name, $content->file_original_name, $bs);
        } catch (FileNotFoundException $e) {
            return redirect()->back()->with('error', __('Sorry, file not found') . '!');
        }
    }

    public function storeText(Request $request, $id)
    {
        $rule = ['text' => 'min:30'];
        // $message = ['text.min' => 'The text must be at least 30 characters.'];
        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $maxOrderNo = LessonContent::where([
            ['lesson_id', $id],
            ['user_id', Auth::guard('web')->user()->id]
        ])->max('order_no');

        $lessonContent = new LessonContent();
        $lessonContent->lesson_id = $id;
        $lessonContent->text = Purifier::clean($request['text']);
        $lessonContent->type = 'text';
        $lessonContent->order_no = $maxOrderNo + 1;
        $lessonContent->user_id = Auth::guard('web')->user()->id;
        $lessonContent->save();

        session()->flash('success', __('Text added successfully') . '!');
        return "success";
    }

    public function updateText(Request $request)
    {
        $rule = ['text' => 'min:30'];

        // $message = ['text.min' => 'The text must be at least 30 characters.'];

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $lessonContent = LessonContent::query()
            ->where('user_id', Auth::guard('web')->user()->id)
            ->find($request['id']);

        $lessonContent->update([
            'text' => Purifier::clean($request['text'])
        ]);

        $request->session()->flash('success', __('Text updated successfully') . '!');
        return "success";
    }

    public function storeCode(Request $request, $id)
    {
        $rule = ['code' => 'required'];

        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $maxOrderNo = LessonContent::where([
            ['lesson_id', $id],
            ['user_id', Auth::guard('web')->user()->id]
        ])->max('order_no');

        $lessonContent = new LessonContent();
        $lessonContent->lesson_id = $id;
        $lessonContent->code = $request['code'];
        $lessonContent->type = 'code';
        $lessonContent->order_no = $maxOrderNo + 1;
        $lessonContent->user_id = Auth::guard('web')->user()->id;
        $lessonContent->save();

        session()->flash('success', __('Code added successfully') . '!');
        return "success";
    }

    public function updateCode(Request $request)
    {
        $rule = ['code' => 'required'];
        $validator = Validator::make($request->all(), $rule);

        if ($validator->fails()) {
            return Response::json([
                'error' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $lessonContent = LessonContent::query()->where('user_id', Auth::guard('web')->user()->id)->find($request['id']);
        $lessonContent->update([
            'code' => $request['code']
        ]);
        session()->flash('success', __('Code updated successfully') . '!');
        // return Response::json(['status' => 'success'], 200);
        return "success";
    }

    public function destroyContent($id)
    {
        $content = LessonContent::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $lessonId = $content->lesson_id;
        $type = $content->type;
        if (!is_null($content->video_unique_name)) Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $content->video_unique_name);
        if (!is_null($content->file_unique_name)) Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $content->file_unique_name);
        $content->delete();

        if ($type == 'video') {
            // update lesson's total period
            $totalPeriod = LessonContent::where([
                ['lesson_id', $lessonId],
                ['type', $type],
                ['user_id', Auth::guard('web')->user()->id]
            ])
                ->sum(DB::raw('TIME_TO_SEC(video_duration)'));

            $lessonDuration = gmdate('H:i:s', $totalPeriod);

            $lesson = Lesson::query()->where('user_id', Auth::guard('web')->user()->id)->find($lessonId);
            $lesson->update([
                'duration' => $lessonDuration
            ]);

            // update module's total period
            $totalLessonPeriod = Lesson::query()->where('module_id', $lesson->module_id)
                ->where('user_id', Auth::guard('web')->user()->id)
                ->sum(DB::raw('TIME_TO_SEC(duration)'));

            $moduleDuration = gmdate('H:i:s', $totalLessonPeriod);

            $module = $lesson->module;
            $module->update([
                'duration' => $moduleDuration
            ]);

            // update course's total period
            $totalModulePeriod = Module::where('course_information_id', $module->course_information_id)
                ->where('user_id', Auth::guard('web')->user()->id)
                ->sum(DB::raw('TIME_TO_SEC(duration)'));

            $courseDuration = gmdate('H:i:s', $totalModulePeriod);

            $course = $module->courseInformation->course;
            $course->update([
                'duration' => $courseDuration
            ]);
        }
        return redirect()->back()->with('success', __('Content deleted successfully') . '!');
    }

    public function sort(Request $request)
    {
        $ids = $request['ids'];
        $orders = $request['orders'];
        for ($i = 0; $i < sizeof($ids); $i++) {
            $content = LessonContent::where('user_id', Auth::guard('web')->user()->id)->find($ids[$i]);
            $content->update([
                'order_no' => $orders[$i]
            ]);
        }
        return response()->json(['status' => __('Lesson contents sorted successfully') . '.'], 200);
    }

    
}
