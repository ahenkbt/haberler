<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Http\Controllers\Controller;
use App\Models\User\CourseManagement\Lesson;
use App\Models\User\CourseManagement\LessonContent;
use App\Models\User\CourseManagement\LessonQuiz;
use App\Models\User\Language;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;

class LessonQuizController extends Controller
{
    public function create($id)
    {
        $defaultLang = Language::where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();
        $lesson = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $module = $lesson->module;
        $courseInfo = $module->courseInformation;
        $default = Language::where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();

        return view('user.course_management.lesson-quiz.create', compact('lesson', 'defaultLang', 'courseInfo', 'default', 'module'));
    }

    public function store($id, Request $request)
    {
        $rules = ['question' => 'required'];
        if (!$request->filled('right_answers') || !$request->filled('options')) {
            $rules['answer'] = 'required';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $quizTypeCount = LessonContent::where([
            ['lesson_id', $id],
            ['user_id', Auth::guard('web')->user()->id]
        ])->where('type', 'quiz')
            ->count();

        $maxOrderNo = LessonContent::where([
            ['lesson_id', $id],
            ['user_id', Auth::guard('web')->user()->id]
        ])->max('order_no');

        if ($quizTypeCount == 0) {
            $content = new LessonContent();
            $content->lesson_id = $id;
            $content->type = 'quiz';
            $content->order_no = $maxOrderNo + 1;
            $content->user_id = Auth::guard('web')->user()->id;
            $content->save();
        } else {
            $contentId = LessonContent::where('lesson_id', $id)
                ->where('type', 'quiz')
                ->pluck('id')
                ->first();
        }

        $options = $request['options'];
        $rightAnswers = $request['right_answers'];
        $answers = [];

        foreach ($options as $key => $option) {
            $ansData = [
                'option' => $option,
                'rightAnswer' => in_array($key, $rightAnswers) ? 1 : 0
            ];

            $answers[$key] = $ansData;
        }

        $quiz = new LessonQuiz();
        $quiz->lesson_id = $id;
        $quiz->lesson_content_id = ($quizTypeCount == 0) ? $content->id : $contentId;
        $quiz->question = $request['question'];
        $quiz->answers = json_encode($answers);
        $quiz->user_id = Auth::guard('web')->user()->id;
        $quiz->save();

        session()->flash('success', __('New quiz added successfully') . '!');

        return "success";
    }

    public function index($id, Request $request)
    {
        $lesson = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $information['lesson'] = $lesson;
        $information['quizzes'] = $lesson->quiz()->orderByDesc('id')->get();
        $information['language'] = Language::where('code', $request->language)
            ->where('user_id', Auth::guard('web')->user()->id)
            ->first();
        return view('user.course_management.lesson-quiz.index', $information);
    }

    public function edit($lessonId, $quizId)
    {
        $information['lesson'] = Lesson::where('user_id', Auth::guard('web')->user()->id)->find($lessonId);
        $information['quiz'] = LessonQuiz::where('user_id', Auth::guard('web')->user()->id)->find($quizId);
        $module = $information['lesson']->module;
        $courseInfo = $module->courseInformation;
        $information['module'] = $module;
        $information['courseInfo'] = $courseInfo;
        $default = Language::where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();
        $information['default'] = $default;

        return view('user.course_management.lesson-quiz.edit', $information);
    }

    public function getAns($id)
    {
        $quiz = LessonQuiz::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $answers = json_decode($quiz->answers);
        return response()->json(['answers' => $answers]);
    }

    public function update(Request $request, $id)
    {
        $rules = ['question' => 'required'];

        if (!$request->filled('right_answers') || !$request->filled('options')) {
            $rules['answer'] = 'required';
        }
        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }

        $options = $request['options'];
        $rightAnswers = $request['right_answers'];
        $answers = [];
        foreach ($options as $key => $option) {
            $ansData = [
                'option' => $option,
                'rightAnswer' => in_array($key, $rightAnswers) ? 1 : 0
            ];

            $answers[$key] = $ansData;
        }
        $quiz = LessonQuiz::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $quiz->update($request->except('answers') + [
            'answers' => json_encode($answers)
        ]);
        session()->flash('success', __('Quiz updated successfully') . '!');
        return "success";
    }

    public function destroy($id)
    {
        $quiz = LessonQuiz::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $content = $quiz->content()->first();

        $quiz->delete();
        if ($content->quiz()->count() == 0) {
            $content->delete();
        }
        return redirect()->back()->with('success', __('Quiz deleted successfully') . '!');
    }
}
