<?php

namespace App\Http\Controllers\User\CourseManagement;

use App\Constants\Constant;
use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Http\Requests\User\CourseManagement\CourseStoreRequest;
use App\Http\Requests\User\CourseManagement\CourseUpdateRequest;
use App\Models\User\CourseManagement\Course;
use App\Models\User\CourseManagement\CourseInformation;
use App\Models\User\Language;
use App\Traits\MiscellaneousTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class CourseController extends Controller
{
    use MiscellaneousTrait;
    /**
     * Display a listing of the resource.
     *
     * @return Application|Factory|View
     */
    public function index(Request $request)
    {
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['language'] = $languages->where('code', $request->language)->first();
        $information['defaultLang'] = $languages->where('dashboard_default', 1)->first();

        $information['courses'] = Course::query()
            ->join('user_course_informations', 'user_courses.id', '=', 'user_course_informations.course_id')
            ->join('user_course_instructors', 'user_course_informations.instructor_id', '=', 'user_course_instructors.id')
            ->join('user_course_categories', 'user_course_categories.id', '=', 'user_course_informations.course_category_id')
            ->where('user_course_informations.language_id', '=', $information['language']->id)
            ->where('user_courses.user_id', '=', Auth::guard('web')->user()->id)
            ->select(
                'user_courses.*',
                'user_course_informations.id as courseInfoId',
                'user_course_informations.title',
                'user_course_instructors.name as instructorName',
                'user_course_categories.name as category'
            )
            ->orderByDesc('user_courses.id')
            ->get();

        $information['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo(Auth::guard('web')->user()->id);

        return view('user.course_management.course.index', $information);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return Application|Factory|View|\Illuminate\Http\Response
     */
    public function create()
    {
        // get all the languages from db
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $defaultLang = $languages->where('dashboard_default', 1)->first();
        $currencyInfo = MiscellaneousTrait::getCurrencyInfo(Auth::guard('web')->user()->id);
        return view('user.course_management.course.create', compact('languages', 'defaultLang', 'currencyInfo'));
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param Request $request
     * @return string
     */
    public function store(CourseStoreRequest $request)
    {

        // store thumbnail image in storage
        $thumbImgName = Uploader::upload_picture(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $request->file('thumbnail_image'));

        // format video link
        $link = $request['video_link'];
        if (strpos($link, '&') != 0) {
            $link = substr($link, 0, strpos($link, '&'));
        }
        // store cover image in storage
        $coverImgName = Uploader::upload_picture(Constant::WEBSITE_COURSE_COVER_IMAGE, $request->file('cover_image'));
        // store data in db
        $course = Course::create($request->except('thumbnail_image', 'video_link', 'cover_image', 'user_id') + [
            'thumbnail_image' => $thumbImgName,
            'video_link' => $link,
            'cover_image' => $coverImgName,
            'user_id' => Auth::guard('web')->user()->id
        ]);
        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        foreach ($languages as $language) {
            $courseInformation = new CourseInformation();
            $courseInformation->user_id = Auth::guard('web')->user()->id;
            $courseInformation->language_id = $language->id;
            $courseInformation->course_category_id = $request[$language->code . '_category_id'];
            $courseInformation->course_id = $course->id;
            $courseInformation->title = $request[$language->code . '_title'];
            $courseInformation->slug = make_slug($request[$language->code . '_title']);
            $courseInformation->instructor_id = $request[$language->code . '_instructor_id'];
            $courseInformation->features = $request[$language->code . '_features'];
            $courseInformation->description = Purifier::clean($request[$language->code . '_description']);
            $courseInformation->meta_keywords = $request[$language->code . '_meta_keywords'];
            $courseInformation->meta_description = $request[$language->code . '_meta_description'];
            $courseInformation->save();
        }
        session()->flash('success', __('New course added successfully') . '!');
        return "success";
    }

    /**
     * Update status (draft/published) of a specified resource.
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function updateStatus(Request $request, $id)
    {
        $course = Course::find($id);

        $course->update([
            'status' => $request['status']
        ]);
        session()->flash('success', __('Course status updated successfully') . '!');

        return redirect()->back();
    }

    /**
     * Update featured status of a specified resource.
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function updateFeatured(Request $request, $id)
    {
        $course = Course::query()->where('user_id', Auth::guard('web')->user()->id)->find($id);
        if ($request['is_featured'] == 'yes') {
            $course->update(['is_featured' => 'yes']);
            session()->flash('success', __('Course featured successfully') . '!');
        } else {
            $course->update(['is_featured' => 'no']);
            session()->flash('success', __('Course removed from featured successfully') . '!');
        }
        return redirect()->back();
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param int $id
     * @return Application|Factory|View|\Illuminate\Http\Response
     */
    public function edit($id)
    {
        $information['course'] = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['languages'] = $languages;
        $information['defaultLang'] = $languages->where('dashboard_default', 1)->first();
        $information['currencyInfo'] = MiscellaneousTrait::getCurrencyInfo(Auth::guard('web')->user()->id);
        return view('user.course_management.course.edit', $information);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param Request $request
     * @param int $id
     * @return string
     */
    public function update(CourseUpdateRequest $request, $id)
    {
        $course = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);

        // store new thumbnail image in storage
        if ($request->hasFile('thumbnail_image')) {
            $thumbImgName = Uploader::update_picture(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $request->file('thumbnail_image'), basename($course->thumbnail_image));
        }

        // format video link
        $link = $request['video_link'];

        if (strpos($link, '&') != 0) {
            $link = substr($link, 0, strpos($link, '&'));
        }

        // store new cover image in storage
        if ($request->hasFile('cover_image')) {
            $coverImgName = Uploader::update_picture(Constant::WEBSITE_COURSE_COVER_IMAGE, $request->file('cover_image'), basename($course->cover_image));
        }

        // update data in db
        $course->update($request->except('thumbnail_image', 'video_link', 'cover_image') + [
            'thumbnail_image' => $request->hasFile('thumbnail_image') ? $thumbImgName : $course->thumbnail_image,
            'video_link' => $link,
            'cover_image' => $request->hasFile('cover_image') ? $coverImgName : $course->cover_image
        ]);

        $languages = Language::where('user_id', Auth::guard('web')->user()->id)->get();

        foreach ($languages as $language) {
            CourseInformation::query()->updateOrCreate([
                'course_id' => $id,
                'user_id' => Auth::guard('web')->user()->id,
                'language_id' => $language->id
            ], [
                'course_category_id' => $request[$language->code . '_category_id'],
                'title' => $request[$language->code . '_title'],
                'slug' => make_slug($request[$language->code . '_title']),
                'instructor_id' => $request[$language->code . '_instructor_id'],
                'features' => $request[$language->code . '_features'],
                'description' => Purifier::clean($request[$language->code . '_description']),
                'user_id' => Auth::guard('web')->user()->id,
                'language_id' => $language->id,
                'meta_keywords' => $request[$language->code . '_meta_keywords'],
                'meta_description' => $request[$language->code . '_meta_description']
            ]);
        }

        session()->flash('success', __('Course updated successfully') . '!');
        return "success";
    }

    /**
     * Show the form for editing the thanks page of a specified resource.
     *
     * @param int $id
     * @return Application|Factory|View|\Illuminate\Http\Response
     */
    public function thanksPage($id)
    {
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $information['course'] = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $information['defaultLang'] = $languages->where('dashboard_default', 1)->first();
        $information['languages'] = $languages;
        return view('user.course_management.course.thanks-page', $information);
    }

    /**
     * Update the thanks page of specified resource in storage.
     *
     * @param Request $request
     * @param int $id
     * @return \Illuminate\Http\Response|string
     */
    public function updateThanksPage(Request $request, $id)
    {
        $languages = Language::query()->where('user_id', Auth::guard('web')->user()->id)->get();
        $rules = $messages = [];
        foreach ($languages as $language) {
            $rules[$language->code . '_thanks_page_content'] = 'min:30';
            $messages[$language->code . '_thanks_page_content.min'] = __('The content must be at least 30 characters for') . ' ' . $language->name . ' ' . __('language') . '.';
        }
        $validator = Validator::make($request->all(), $rules, $messages);
        if ($validator->fails()) {
            return Response::json([
                'errors' => $validator->getMessageBag()->toArray()
            ], 400);
        }
        foreach ($languages as $language) {
            CourseInformation::query()->updateOrCreate(
                [
                    'course_id' => $id,
                    'language_id' => $language->id,
                    'user_id' => Auth::guard('web')->user()->id,
                ],
                [
                    'course_id' => $id,
                    'language_id' => $language->id,
                    'user_id' => Auth::guard('web')->user()->id,
                    'thanks_page_content' => Purifier::clean($request[$language->code . '_thanks_page_content'])
                ]
            );
        }
        session()->flash('success', __('Page content updated successfully') . '!');
        return "success";
    }

    /**
     * Show the certificate settings page of a specified resource.
     *
     * @param int $id
     * @return Application|Factory|View|\Illuminate\Http\Response
     */
    public function certificateSettings($id)
    {
        $information['course'] = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $information['defaultLang'] = Language::where('user_id', Auth::guard('web')->user()->id)->where('dashboard_default', 1)->first();
        return view('user.course_management.course.certificate-settings', $information);
    }

    /**
     * Update the certificate settings of specified resource in storage.
     *
     * @param Request $request
     * @param int $id
     * @return RedirectResponse
     */
    public function updateCertificateSettings(Request $request, $id)
    {
        $course = Course::where('user_id', Auth::guard('web')->user()->id)->find($id);
        $course->update($request->except('certificate_text') + [
            'certificate_text' => Purifier::clean($request['certificate_text'])
        ]);
        session()->flash('success', __('Certificate settings updated successfully') . '.');
        return redirect()->back();
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return RedirectResponse
     */
    public function destroy($id)
    {

        $course = Course::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->first();

        // check whether this course has any enrolment or not
        $totalEnrolment = $course->enrolment()->count();

        if ($totalEnrolment > 0) {
            return redirect()->back()->with('warning', __('First delete all the enrolments of this course') . '!');
        }

        // get all the course information's of this course
        $courseInformations = $course->courseInformation()->where('user_id', Auth::guard('web')->user()->id)->get();

        foreach ($courseInformations as $courseInformation) {

            // get all the modules of each course-information
            $modules = $courseInformation->module()->get();

            foreach ($modules as $module) {
                // get all the lessons of each module
                $lessons = $module->lesson()->get();

                foreach ($lessons as $lesson) {
                    // get all the lesson contents of each lesson
                    $lessonContents = $lesson->content()->get();

                    foreach ($lessonContents as $lessonContent) {
                        // delete lesson content item by checking the 'type'
                        if ($lessonContent->type == 'video') {
                            Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $lessonContent->video_unique_name);
                        } else if ($lessonContent->type == 'file') {
                            Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $lessonContent->file_unique_name);
                        } else if ($lessonContent->type == 'quiz') {
                            // get all the lesson quizzes of this lesson-content
                            $lessonQuizzes = $lessonContent->quiz()->get();
                            foreach ($lessonQuizzes as $lessonQuiz) {
                                $lessonQuiz->delete();
                            }
                        }
                        $lessonContent->delete();
                    }
                    $lesson->delete();
                }
                $module->delete();
            }

            $courseInformation->delete();
        }
        Uploader::remove(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $course->thumbnail_image);
        Uploader::remove(Constant::WEBSITE_COURSE_COVER_IMAGE, $course->cover_image);

        // get all the faqs of this course
        $courseFaqs = $course->faq()->get();
        foreach ($courseFaqs as $courseFaq) {
            $courseFaq->delete();
        }

        // get all the reviews of this course
        $reviews = $course->review()->get();
        foreach ($reviews as $review) {
            $review->delete();
        }
        // get all the quiz-scores of this course
        $quizScores = $course->quizScore()->get();
        foreach ($quizScores as $quizScore) {
            $quizScore->delete();
        }
        // finally, delete the course
        $course->delete();
        return redirect()->back()->with('success', __('Course deleted successfully') . '!');
    }

    /**
     * Remove the selected or all resources from storage.
     *
     * @param Request $request
     * @return \Illuminate\Http\Response|string
     */
    public function bulkDestroy(Request $request)
    {
        
        $ids = $request->ids;
        foreach ($ids as $id) {
            $course = Course::where('user_id', Auth::guard('web')->user()->id)->where('id', $id)->first();
            // check whether this course has any enrolment or not
            $totalEnrolment = $course->enrolment()->count();
            if ($totalEnrolment > 0) {
                session()->flash('warning', __('First delete all the enrolments of selected courses') . '!');
                return "success";
            }
            // get all the course information's of this course
            $courseInformations = $course->courseInformation()->where('user_id', Auth::guard('web')->user()->id)->get();

            foreach ($courseInformations as $courseInformation) {
                // get all the modules of each course-information
                $modules = $courseInformation->module()->get();
                foreach ($modules as $module) {
                    // get all the lessons of each module
                    $lessons = $module->lesson()->get();
                    foreach ($lessons as $lesson) {
                        // get all the lesson contents of each lesson
                        $lessonContents = $lesson->content()->get();
                        foreach ($lessonContents as $lessonContent) {
                            // delete lesson content item by checking the 'type'
                            if ($lessonContent->type == 'video') {
                                Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_VIDEO, $lessonContent->video_unique_name);
                            } else if ($lessonContent->type == 'file') {
                                Uploader::remove(Constant::WEBSITE_LESSON_CONTENT_FILE, $lessonContent->file_unique_name);
                            } else if ($lessonContent->type == 'quiz') {
                                // get all the lesson quizzes of this lesson-content
                                $lessonQuizzes = $lessonContent->quiz()->get();
                                foreach ($lessonQuizzes as $lessonQuiz) {
                                    $lessonQuiz->delete();
                                }
                            }
                            $lessonContent->delete();
                        }
                        $lesson->delete();
                    }
                    $module->delete();
                }
                $courseInformation->delete();
            }
            Uploader::remove(Constant::WEBSITE_COURSE_THUMBNAIL_IMAGE, $course->thumbnail_image);
            Uploader::remove(Constant::WEBSITE_COURSE_COVER_IMAGE, $course->cover_image);
            // get all the faqs of this course
            $courseFaqs = $course->faq()->get();
            foreach ($courseFaqs as $courseFaq) {
                $courseFaq->delete();
            }
            // get all the reviews of this course
            $reviews = $course->review()->get();
            foreach ($reviews as $review) {
                $review->delete();
            }
            // get all the quiz-scores of this course
            $quizScores = $course->quizScore()->get();
            foreach ($quizScores as $quizScore) {
                $quizScore->delete();
            }
            // finally, delete the course
            $course->delete();
        }
       session()->flash('success', __('Courses deleted successfully') . '!');
        return "success";
    }
}
