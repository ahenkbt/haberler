<?php

namespace App\Http\Controllers\User;

use App\Http\Controllers\Controller;
use App\Models\User\Language;
use App\Models\User\Blog;
use App\Models\User\BlogCategory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Session;
use Illuminate\Support\Facades\Validator;
use Mews\Purifier\Facades\Purifier;

class BlogController extends Controller
{
    /**
     * Display a listing of the resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function index(Request $request)
    {
        $lang = Language::where([['code', $request->language], ['user_id', Auth::id()]])->firstOrFail();
        $data['blogs'] = Blog::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::guard('web')->user()->id],
        ])
            ->orderBy('id', 'DESC')
            ->get();

        $data['bcats'] = BlogCategory::where([
            ['language_id', '=', $lang->id],
            ['user_id', '=', Auth::guard('web')->user()->id],
            ['status', '=', 1]
        ])
            ->orderBy('id', 'DESC')
            ->get();
        return view('user.blog.blog.index', $data);
    }

    /**
     * Show the form for creating a new resource.
     *
     * @return \Illuminate\Http\Response
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @return \Illuminate\Http\Response
     */
    public function store(Request $request)
    {
        $img = $request->file('image');
        $img2 = $request->file('image2');
        $allowedExts = array('jpg', 'png', 'jpeg');

        $slug = make_slug($request->title);
        $rules = [
            'user_language_id' => 'required',
            'title' => 'required|max:255',
            'category' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
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
            'image2' => [
                'sometimes',
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
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $input['category_id'] = $request->category;
        $input['language_id'] = $request->user_language_id;
        $input['slug'] = $slug;
        $input['user_id'] = Auth::guard('web')->user()->id;

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/blogs/');
            if (!file_exists($directory)) mkdir($directory, 0775, true);
            $request->file('image')->move($directory, $filename);
            $input['image'] = $filename;
        }
        if ($request->hasFile('image2')) {
            $filename2 = time() . '.' . $img2->getClientOriginalExtension();
            $directory = public_path('assets/front/img/user/blogs/');
            if (!file_exists($directory)) mkdir($directory, 0775, true);
            $request->file('image2')->move($directory, $filename2);
            $input['image2'] = $filename2;
        }
        $input['content'] = Purifier::clean($request->content);
        $blog = new Blog;
        $blog->create($input);

        Session::flash('success', __('Blog added successfully') . '!');
        return "success";
    }

    public function updateSliderPost(Request $request)
    {
        if ($request->is_slider == 1) {
            $img = $request->hasFile('slider_post_image') ? $request->file('slider_post_image') : null;

            $sldPostImgURL = $request->hasFile('slider_post_image') ? $request->slider_post_image : null;
            $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');
            $sldPostImgExt = $request->hasFile('slider_post_image') ? $sldPostImgURL->extension() : null;

            $rules = [
                'slider_post_image' => [
                    'required',
                    function ($attribute, $value, $fail) use ($allowedExtensions, $sldPostImgExt) {
                        if (!in_array($sldPostImgExt, $allowedExtensions)) {
                            $fail('Only .jpg, .jpeg, .png and .svg file is allowed.');
                        }
                    }
                ]
            ];

            $message = [
                'slider_post_image.required' => 'The image field is required.'
            ];

            $validator = Validator::make($request->all(), $rules, $message);

            if ($validator->fails()) {
                return Response::json([
                    'errors' => $validator->getMessageBag()->toArray()
                ], 400);
            }

            if ($request->hasFile('slider_post_image')) {
                $filename = time() . '.' . $img->getClientOriginalExtension();
                $directory = public_path('assets/front/img/user/blogs/slider/');
                if (!file_exists($directory)) mkdir($directory, 0775, true);
                $request->file('slider_post_image')->move($directory, $filename);
                $input['image'] = $filename;
            }

            // update data in db
            $blog = Blog::findOrFail($request->id);


            $blog->update([
                'is_slider' => 1,
                'slider_post_image' => $filename
            ]);

            Session::flash('success', __('Post added for slider') . '!');

            return 'success';
        } else {
            $blog = Blog::findOrFail($request->id);

            // first, delete the image
            @unlink(public_path('assets/front/img/user/blogs/slider/' . $blog->slider_post_image));

            // then, update data in db
            $blog->update([
                'is_slider' => 0,
                'slider_post_image' => null
            ]);

            Session::flash('success', __('Post removed from slider') . '!');

            return response()->json(['data' => 'successful']);
        }
    }

    public function updateFeaturedPost(Request $request)
    {
        if ($request->is_featured == 1) {
            $img = $request->hasFile('featured_post_image') ? $request->file('featured_post_image') : null;
            $featPostImgURL = $request->hasFile('featured_post_image') ? $request->featured_post_image : null;
            $allowedExtensions = array('jpg', 'jpeg', 'png', 'svg');

            $featPostImgExt = $request->hasFile('featured_post_image') ? $featPostImgURL->extension() : null;

            $rules = [
                'featured_post_image' => [
                    'required',
                    function ($attribute, $value, $fail) use ($allowedExtensions, $featPostImgExt) {
                        if (!in_array($featPostImgExt, $allowedExtensions)) {
                            $fail('Only .jpg, .jpeg, .png and .svg file is allowed.');
                        }
                    }
                ]
            ];

            $message = [
                'featured_post_image.required' => 'The image field is required.'
            ];

            $validator = Validator::make($request->all(), $rules, $message);

            if ($validator->fails()) {
                return Response::json([
                    'errors' => $validator->getMessageBag()->toArray()
                ], 400);
            }

            if ($request->hasFile('featured_post_image')) {
                $filename = time() . '.' . $img->getClientOriginalExtension();
                $directory = public_path('assets/front/img/user/blogs/featured/');
                if (!file_exists($directory)) mkdir($directory, 0775, true);
                $request->file('featured_post_image')->move($directory, $filename);
                $input['image'] = $filename;
            }

            // update data in db
            $blog = Blog::findOrFail($request->id);

            $blog->update([
                'is_featured' => 1,
                'featured_post_image' => $filename
            ]);

            Session::flash('success', __('Post featured successfully') . '!');

            return 'success';
        } else {
            $blog = Blog::findOrFail($request->id);

            // first, delete the image
            @unlink(public_path('assets/front/img/user/blogs/featured/' . $blog->featured_post_image));

            // then, update data in db
            $blog->update([
                'is_featured' => 0,
                'featured_post_image' => null
            ]);

            Session::flash('success', __('Post unfeatured successfully') . '!');

            return response()->json(['data' => 'successful'], 200);
        }
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
        $data['blog'] = Blog::findOrFail($id);
        $data['bcats'] = BlogCategory::where([
            ['language_id', '=', $data['blog']->language_id],
            ['user_id', '=', Auth::guard('web')->user()->id],
            ['status', '=', 1]
        ])
            ->orderBy('serial_number', 'ASC')
            ->get();
        return view('user.blog.blog.edit', $data);
    }

    /**
     * Update the specified resource in storage.
     *
     * @param \Illuminate\Http\Request $request
     * @param int $id
     * @return \Illuminate\Http\Response
     */
    public function update(Request $request)
    {
        $img = $request->file('image');
        $img2 = $request->file('image2');
        $allowedExts = array('jpg', 'png', 'jpeg');
        $slug = make_slug($request->title);

        $rules = [
            'title' => 'required|max:255',
            'category' => 'required',
            'content' => 'required',
            'serial_number' => 'required|integer',
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
            'image2' => [
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
            $errmsgs = $validator->getMessageBag()->add('error', 'true');
            return response()->json($validator->errors());
        }
        $input = $request->all();
        $blog = Blog::where('user_id', Auth::user()->id)->where('id', $request->blog_id)->firstOrFail();
        $input['category_id'] = $request->category;
        $input['slug'] = $slug;
        $input['user_id'] = Auth::guard('web')->user()->id;

        if ($request->hasFile('image')) {
            $filename = time() . '.' . $img->getClientOriginalExtension();
            $request->file('image')->move(public_path('assets/front/img/user/blogs/'), $filename);
            @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
            $input['image'] = $filename;
        }
        if ($request->hasFile('image2')) {
            $filename2 = time() . '.' . $img2->getClientOriginalExtension();
            $request->file('image2')->move(public_path('assets/front/img/user/blogs/'), $filename2);
            @unlink(public_path('assets/front/img/user/blogs/' . $blog->image2));
            $input['image2'] = $filename2;
        }
        $input['content'] = Purifier::clean($request->content);
        $blog->update($input);
        Session::flash('success', __('Blog updated successfully') . '!');
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
        return BlogCategory::where([
            ['language_id', $langid],
            ['user_id', '=', Auth::guard('web')->user()->id],
            ['status', '=', 1]
        ])->get();
    }

    public function delete(Request $request)
    {
        $blog = Blog::where('user_id', Auth::user()->id)->where('id', $request->blog_id)->firstOrFail();
        if (file_exists(public_path('assets/front/img/user/blogs/' . $blog->image))) {
            @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
        }
        $blog->delete();
        Session::flash('success', __('Blog deleted successfully') . '!');
        return back();
    }

    public function bulkDelete(Request $request)
    {
        $ids = $request->ids;
        foreach ($ids as $id) {
            $blog = Blog::where('user_id', Auth::user()->id)->where('id', $id)->firstOrFail();
            if (file_exists(public_path('assets/front/img/user/blogs/' . $blog->image))) {
                @unlink(public_path('assets/front/img/user/blogs/' . $blog->image));
            }
            $blog->delete();
        }
        Session::flash('success', __('Blogs deleted successfully') . '!');
        return "success";
    }
}
