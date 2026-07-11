<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Model;

class Blog extends Model
{
    public $table = "user_blogs";
    protected $fillable = [
        "title",
        "slug",
        "image",
        "image2",
        "content",
        "serial_number",
        "language_id",
        "category_id",
        "user_id",
        "meta_keywords",
        "meta_description",
        "is_slider",
        "slider_post_image",
        "is_featured",
        "featured_post_image",
        "views"
    ];


    public function bcategory() {
        return $this->belongsTo('App\Models\User\BlogCategory','category_id');
    }

    public function language() {
        return $this->belongsTo(Language::class,'language_id');
    }
}
