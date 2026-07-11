<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Member extends Model
{
    use HasFactory;

    protected $table = "user_members";

    public $timestamps = false;

    protected $fillable = [
        'language_id',
        'user_id',
        'name',
        'rank',
        'image',
        'facebook',
        'twitter',
        'instagram',
        'linkedin',
        'featured'
    ];
    public function memberLang(): \Illuminate\Database\Eloquent\Relations\BelongsTo
    {
        return $this->belongsTo(Language::class);
    }
}
