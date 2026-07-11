<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Http\Helpers\Uploader;
use App\Models\User\Language;
use App\Models\User\Portfolio;
use App\Models\User\PortfolioCategory;
use App\Models\User\PortfolioImage;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;
use Purifier;
use Validator;

class PortfolioController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return
     */
    public function index(Request $request)
    {
        $lang = Language::where('code', $request->language)->where('user_id', Auth::guard('web')->user()->id)->firstorFail();

        $data['portfolios'] = Portfolio::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
        ])
            ->orderBy('id', 'DESC')
            ->get();

        $data['categories'] = PortfolioCategory::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::id()],
            ['status', '=', 1]
        ])
            ->orderBy('serial_number', 'ASC')
            ->get();
        return view('user.portfolio.portfolio.index', $data);
    }

    public function sliderstore(Request $request)
    {
        $img = $request->file('file');
        $allowedExts = ['jpg', 'png', 'jpeg'];

        $rules = [
            'file' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    $ext = $img->getClientOriginalExtension();
                    if (!in_array($ext, $allowedExts)) {
                        return $fail(__('Only png, jpg, jpeg images are allowed') . ".");
                    }
                },
            ]
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }

        $filename = Uploader::upload_picture('assets/front/img/user/portfolios/', $img);

        $pi = new PortfolioImage;
        if (!empty($request->portfolio_id)) {
            $pi->user_portfolio_id = $request->portfolio_id;
        }
        $pi->image = $filename;
        $pi->user_id = Auth::user()->id;
        $pi->save();

        return response()->json(['status' => 'success', 'file_id' => $pi->id]);
    }

    public function sliderrmv(Request $request)
    {
        $pi = PortfolioImage::findOrFail($request->fileid);
        if (!empty($request->type) && $request->type == 'edit') {
            if (PortfolioImage::where('user_portfolio_id', $pi->user_portfolio_id)->count() == 1) {
                return "minimum_one";
            }
        }
        @unlink(public_path('assets/front/img/user/portfolios/' . $pi->image));
        $pi->delete();
        return $pi->id;
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     */
    public function store(Request $request)
    {
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $slug = make_slug($request->title);
        $rules = [
            'user_language_id' => 'required',
            'title' => 'required|max:255',
            'category' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
            'status' => 'required',
            'client_name' => 'nullable',
            'start_date' => 'nullable',
            'submission_date' => 'nullable',
            'website_link' => 'nullable',
            'image' => [
                'required',
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
            'slider_images' => 'required',
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        if (!isset($request->featured)) $request["featured"] = "0";
        $input = $request->all();
        $input['category_id'] = $request->category;
        $input['language_id'] = $request->user_language_id;
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/portfolios/');
            @mkdir($directory, 0775, true);
            $request->file('image')->move($directory, $filename);
            $input['image'] = $filename;
        }
        $input['content'] = Purifier::clean($request->content);
        $portfolio = new Portfolio;
        $portfolio = $portfolio->create($input);

        $sliders = $request->slider_images;
        $pis = PortfolioImage::findOrFail($sliders);
        foreach ($pis as $key => $pi) {
            $pi->user_portfolio_id = $portfolio->id;
            $pi->save();
        }

        $exSliders = PortfolioImage::whereNull('user_portfolio_id')->get();
        foreach ($exSliders as $key => $exSlider) {
            @unlink(public_path('assets/front/img/user/portfolios/' . $exSlider->image));
        }

        Session::flash('success', __('Portfolio added successfully') . '!');
        return "success";
    }

    /**
     * Display the specified resource.
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function show($id)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     *
     * @param int $id
     * @return
     */
    public function edit($id)
    {
        $data['portfolio'] = Portfolio::findOrFail($id);
        $data['categories'] = PortfolioCategory::where([
            ['language_id', '=', $data['portfolio']->language_id],
            ['user_id', '=', Auth::id()],
            ['status', '=', 1]
        ])
            ->orderBy('serial_number', 'ASC')
            ->get();
        return view('user.portfolio.portfolio.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param int $id
     *
     */
    public function update(Request $request)
    {
        $img = $request->file('image');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $slug = make_slug($request->title);

        $rules = [
            'title' => 'required|max:255',
            'category' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
            'status' => 'required',
            'client_name' => 'nullable',
            'start_date' => 'nullable',
            'submission_date' => 'nullable',
            'website_link' => 'nullable',
            'image' => [
                function ($attribute, $value, $fail) use ($img, $allowedExts) {
                    if (!empty($img)) {
                        $ext = $img->getClientOriginalExtension();
                        if (!in_array($ext, $allowedExts)) {
                            return $fail(__('Only png, jpg, jpeg image is allowed') . ".");
                        }
                    }
                },
            ],
        ];

        $validator = Validator::make($request->all(), $rules);
        if ($validator->fails()) {
            $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $portfolio = Portfolio::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        $input['category_id'] = $request->category;
        $input['slug'] = $slug;
        $input['user_id'] = Auth::id();
        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $request->file('image')->move(public_path('assets/front/img/user/portfolios/'), $filename);
            @unlink(public_path('assets/front/img/user/portfolios/' . $portfolio->image));
            $input['image'] = $filename;
        }
        if (!isset($request->featured)) $input["featured"] = "0";
        $input['content'] = Purifier::clean($request->content);
        $portfolio->update($input);
        Session::flash('success', __('Portfolio updated successfully') . '!');
        return "success";
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function getcats($langid)
    {
        return PortfolioCategory::where([
            ['language_id', $langid],
            ['user_id', '=', Auth::id()],
            ['status', '=', 1]
        ])
            ->orderBy('serial_number', 'ASC')
            ->get();
    }

    public function delete(Request $request)
    {
        $portfolio = Portfolio::where('user_id', Auth::user()->id)->where('id', $request->id)->firstOrFail();
        foreach ($portfolio->portfolio_images as $key => $pi) {
            @unlink(public_path('assets/front/img/user/portfolios/' . $pi->image));
            $pi->delete();
        }
        @unlink(public_path('assets/front/img/user/portfolios/' . $portfolio->image));
        $portfolio->delete();
        Session::flash('success', __('Portfolio deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $portfolio = Portfolio::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            foreach ($portfolio->portfolio_images as $key => $pi) {
                @unlink(public_path('assets/front/img/user/portfolios/' . $pi->image));
                $pi->delete();
            }
            @unlink(public_path('assets/front/img/user/portfolios/' . $portfolio->image));
            $portfolio->delete();
        }
        Session::flash('success', __('Portfolios deleted successfully') . '!');
        return "success";
    }

    public function images($portid)
    {
        $images = PortfolioImage::where('user_portfolio_id', $portid)->get();
        return $images;
    }
    public function featured(Request $request): \Illuminate\Http\RedirectResponse
    {
        $member = Portfolio::where('user_id', Auth::user()->id)->where('id', $request->portfolio_id)->firstOrFail();
        $member->featured = $request->featured;
        $member->save();
        if ($request->featured == 1) {
            Session::flash('success', __('Featured successfully') . '!');
        } else {
            Session::flash('success', __('Unfeatured successfully') . '!');
        }
        return back();
    }
}
