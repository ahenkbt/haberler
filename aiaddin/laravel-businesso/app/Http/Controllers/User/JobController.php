<?php

namespace App\Http\Controllers\User;

use App\Models\User\Jcategory;
use App\Models\User\Job;
use App\Models\User\Language;
use Illuminate\Http\Request;
use App\Http\Controllers\Controller;
use Illuminate\Support\Facades\Auth;
use Validator;
use Session;

class JobController extends Controller
{
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();
        
        $data['jobs'] = Job::where([
            ['language_id', $lang->id],
            ['user_id', Auth::id()]
        ])
            ->orderBy('id', 'DESC')
            ->get();

        return view('user.job.job.index', $data);
    }

    public function edit($id)
    {
        $data['job'] = Job::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
        $data['jcats'] = Jcategory::where('status', 1)->where([
            ['language_id', $data['job']->language_id],
            ['user_id', Auth::id()]
        ])->get();
        return view('user.job.job.edit', $data);
    }

    public function create()
    {
        return view('user.job.job.create');
    }

    public function store(Request $request)
    {
        $slug = make_slug($request->title);

        $rules = [
            'user_language_id' => 'required',
            'deadline' => 'required|date',
            'jcategory_id' => 'required',
            'title' => [
                'required',
                'max:255',
                function ($attribute, $value, $fail) use ($slug) {
                    $jobs = Job::all();
                    foreach ($jobs as $key => $job) {
                        if (strtolower($slug) == strtolower($job->slug)) {
                            $fail(__('The title field must be unique') . '.');
                        }
                    }
                }
            ],
            'vacancy' => 'required|integer',
            'employment_status' => 'required|max:255',
            'additional_requirements' => 'nullable',
            'job_location' => 'required|max:255',
            'salary' => 'required',
            'email' => 'required|email|max:255',
            'benefits' => 'nullable',
            'read_before_apply' => 'nullable',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $request['user_id'] = Auth::id();
        $in = $request->all();
        $in['slug'] = $slug;
        $in['language_id'] = $request->user_language_id;
        $in['job_responsibilities'] = clean($request->job_responsibilities);
        $in['educational_requirements'] = clean($request->educational_requirements);
        $in['experience_requirements'] = clean($request->experience_requirements);
        $in['additional_requirements'] = clean($request->additional_requirements);
        $in['salary'] = clean($request->salary);
        $in['benefits'] = clean($request->benefits);
        $in['read_before_apply'] = clean($request->read_before_apply);
        Job::create($in);

        Session::flash('success', __('Job posted successfully') . '!');
        return "success";
    }

    public function update(Request $request)
    {
        $slug = make_slug($request->title);
        $jobId = $request->job_id;

        $rules = [
            'deadline' => 'required|date',
            'experience' => 'required',
            'jcategory_id' => 'required',
            'title' => [
                'required',
                'max:255',
                function ($attribute, $value, $fail) use ($slug, $jobId) {
                    $jobs = Job::all();
                    foreach ($jobs as $key => $job) {
                        if ($job->id != $jobId && strtolower($slug) == strtolower($job->slug)) {
                            $fail(__('The title field must be unique') . '.');
                        }
                    }
                }
            ],
            'vacancy' => 'required|integer',
            'employment_status' => 'required|max:255',
            'job_location' => 'required|max:255',
            'salary' => 'required',
            'email' => 'required|email|max:255',
            'benefits' => 'nullable',
            'read_before_apply' => 'nullable',
            'serial_number' => 'required|integer',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $job = Job::where('user_id', Auth::user()->id)->where('id', $jobId)->firstOrFail();
        $in = $request->all();
        $in['slug'] = $slug;

        $in['job_responsibilities'] = clean($request->job_responsibilities);
        $in['educational_requirements'] = clean($request->educational_requirements);
        $in['experience_requirements'] = clean($request->experience_requirements);
        $in['additional_requirements'] = clean($request->additional_requirements);
        $in['salary'] = clean($request->salary);
        $in['benefits'] = clean($request->benefits);
        $in['read_before_apply'] = clean($request->read_before_apply);

        $job->fill($in)->save();

        Session::flash('success', __('Job details updated successfully') . '!');
        return "success";
    }

    public function delete(Request $request)
    {
        $job = Job::where('user_id', Auth::user()->id)->where('id', $request->job_id)->firstOrFail();
        $job->delete();

        Session::flash('success', __('Job deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;

        foreach ($ids as $id) {
            Job::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail()->delete();
        }

        Session::flash('success', __('Jobs deleted successfully') . '!');
        return "success";
    }

    public function getcats($langid)
    {
        return Jcategory::where([
            ['language_id', $langid],
            ['user_id', Auth::id()]
        ])->get();
    }
}
