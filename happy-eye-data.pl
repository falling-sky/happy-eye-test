#! /usr/bin/env perl

# Create charts based on daily_summary

use Getopt::Long;
use POSIX strftime;
use IO::File;
use Socket6;
use Data::Dumper;
use JSON;
use YAML::Syck;
use DBI;
use strict;

$| = 1;

my ( $MirrorConfig, $PrivateConfig, $dbh, $outfile, %counts );


$ENV{"TZ"} = "UTC";

################################################################
# getopt                                                       #
################################################################

my ( $usage, %argv, %input ) = "";

%input = (
           "rescan=i"  => "rescan this many days (3)",
           "config=s"  => "config.js file (REQUIRED)",
           "private=s" => "private.js file (default: same place as config.js)",
           "v|verbose" => "spew extra data to the screen",
           "h|help"    => "show option help"
         );

my $result = GetOptions( \%argv, keys %input );
$argv{"rescan"} ||= 3;
if ( ( $argv{"config"} ) && ( !$argv{"private"} ) ) {
    $argv{"private"} = $argv{"config"};
    $argv{"private"} =~ s#[^/]+$#private.js#;
}

if ( ( !$result ) || ( !$argv{"config"} ) || ( $argv{h} ) ) {
    &showOptionsHelp;
    exit 0;
}

################################################################
# configs                                                      #
################################################################

sub get_file {
    my ($file) = @_;
    my $handle = new IO::File "<$file" or die "Could not open $file : $!";
    my $buffer;
    read $handle, $buffer, -s $file;
    close $handle;
    return $buffer;

}

sub get_config {
    my ( $file, $varname ) = @_;
    my $got = get_file($file);

    # Remove varname
    $got =~ s#^\s*$varname\s*=\s*##ms;

    # Remove comments like /* and */  and //
    $got =~ s#(/\*([^*]|[\r\n]|(\*+([^*/]|[\r\n])))*\*+/)|([\s\t](//).*)##mg;

    # And trailing commas
    $got =~ s/,\s*([\]}])/$1/mg;

    my $ref = decode_json($got);
    if ( !$ref ) {
        die "Could not json parse $file\n";
    }
    return $ref;
}

sub validate_private_config {
    my ($ref) = @_;
    die "Missing private.js: db password" unless ( $ref->{db}{password} );
    die "Missing private.js: db db"       unless ( $ref->{db}{db} );
    die "Missing private.js: db username" unless ( $ref->{db}{username} );
    die "Missing private.js: db host"     unless ( $ref->{db}{host} );
    die "Missing private.js: paths rrd"   unless ( $ref->{paths}{rrd} );
    die "Missing private.js: paths png"   unless ( $ref->{paths}{png} );
}

################################################################
# utilities                                                    #
################################################################

sub get_db_handle {
    my ($dbref) = @_;
    my $dsn = sprintf( "DBI:mysql:database=%s;host=%s", $dbref->{db}, $dbref->{host} );
    my $dbh = DBI->connect( $dsn, $dbref->{username}, $dbref->{password} );
    die "Failed to connect to mysql" unless ($dbh);
    return $dbh;
}

my %my_mkdir;

sub my_mkdir {
    my ($dir) = @_;
    return if ( $my_mkdir{$dir}++ );
    return if ( -d $dir );
    system( "mkdir", "-p", $dir );
    return if ( -d $dir );
    die "Unable to create $dir\: $!";

}

sub showOptionsHelp {
    my ( $left, $right, $a, $b, $key );
    my (@array);
    print "Usage: $0 [options] $usage\n";
    print "where options can be:\n";
    foreach $key ( sort keys(%input) ) {
        ( $left, $right ) = split( /[=:]/, $key );
        ( $a,    $b )     = split( /\|/,   $left );
        if ($b) {
            $left = "-$a --$b";
        } else {
            $left = "   --$a";
        }
        $left = substr( "$left" . ( ' ' x 20 ), 0, 20 );
        push( @array, "$left $input{$key}\n" );
    }
    print sort @array;
}

################################################################
# Prep daily and monthly summaries in the database             #
################################################################

sub update_summary {
    my ($rescan) = @_;

    my $unix = time - $rescan * 86400;

    my $day = strftime( '%Y-%m-%d', localtime $unix );
    my $start = "$day 00:00:00";
    my %byvalues;

    {
        my $sql_template = <<"EOF";
select survey.tokens as tokens,
       user_agents.user_agent as ua,
       count(*) as count 
  from survey,user_agents 
 where survey.timestamp > ? 
       and survey.ua_id = user_agents.id
       group by concat(survey.tokens,user_agents.user_agent);
EOF
        my $sth = $dbh->prepare($sql_template);
        $sth->execute($start) or die $sth->errstr;

        while ( my $ref = $sth->fetchrow_hashref() ) {
            print "." if ( $argv{"v"} );
            my $tokens = ${$ref}{"tokens"};
            my $ua     = ${$ref}{"ua"};
            my $count  = ${$ref}{"count"};

            next if ( $tokens =~ /ipv4_only/ );
            next if ( $tokens =~ /ipv6_only/ );

            my $prefer;
            $prefer = "ipv4" if ( $tokens =~ /dualstack:ipv4_preferred/ );
            $prefer = "ipv6" if ( $tokens =~ /dualstack:ipv6_preferred/ );

            next unless ($prefer);
            $counts{$ua}{$prefer} += $count;
            $counts{$ua}{total} += $count;
        }
        $sth->finish();
        print "\n" if ( $argv{"v"} );

    } ## end while ( $unix <= time )
}

sub numpad {
  my ($s) = @_;
  $s =~ s/\b(\d+)\b/sprintf('%05i',$1)/ge;
  return $s;
}
sub bynumpad {
 return numpad($a) cmp numpad($b) || $a cmp $b;
}

sub dump_counts {    

  my @array;
  foreach my $key (sort bynumpad keys %counts) {
    $counts{$key}{ua}=$key;
    $counts{$key}{ipv4} ||= 0;
    $counts{$key}{ipv6} ||= 0;
    $counts{$key}{total} ||= 0;
    
    $counts{$key}{happy} = 100 *  $counts{$key}{ipv6} / $counts{$key}{total};
    push(@array, $counts{$key});
  }

   my $json = JSON->new->allow_nonref;
   my $dump =  $json->pretty->encode( \@array ); # pretty-printing
    
#    my $dump = encode_json(\%counts);
    open(FILE,">$outfile.$$") or die "failed to create $outfile.$$ : $!";
    print FILE "hedata=";
    print FILE $dump;
    print FILE ";\n";
    close FILE;
    rename("$outfile.$$","$outfile");
}

################################################################
# main                                                         #
################################################################

$MirrorConfig  = get_config( $argv{"config"},  "MirrorConfig" );
$PrivateConfig = get_config( $argv{"private"}, "PrivateConfig" );
validate_private_config($PrivateConfig);
$dbh = get_db_handle( $PrivateConfig->{db} );
$outfile = $PrivateConfig->{paths}->{hedata};
die "missing private config paths -> hedata (filename, string)" unless ($outfile);


update_summary( $argv{"rescan"} );
dump_counts();

